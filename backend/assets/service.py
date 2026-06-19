import uuid
import datetime
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.assets.models import Asset, AssetType, AssetEvent, AssetGraphNode, AssetGraphEdge
from backend.assets.schemas import AssetCreate, AssetUpdate, AssetFilter
from backend.assets.graph import AssetGraphManager
from backend.assets.providers import AssetDiscoveryOrchestrator
from backend.assets.events import AssetEventType
from backend.websocket.manager import manager
import logging

logger = logging.getLogger("buggi.assets.service")


class AssetService:
    def __init__(self, db: Session):
        self.db = db

    def create_asset(self, data: AssetCreate) -> Asset:
        asset = Asset(
            id=str(uuid.uuid4()),
            scan_id=data.scan_id,
            asset_type=data.asset_type,
            asset_value=data.asset_value,
            meta=data.meta or {},
            source=data.source,
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        self._record_event(asset.scan_id, AssetEventType.ASSET_DISCOVERED, {
            "asset_id": asset.id,
            "asset_type": asset.asset_type.value,
            "asset_value": asset.asset_value,
            "source": asset.source,
        })
        return asset

    def bulk_create_assets(self, scan_id: str, asset_dicts: List[Dict[str, Any]]) -> List[Asset]:
        assets = []
        for d in asset_dicts:
            asset = Asset(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                asset_type=d["asset_type"],
                asset_value=d["asset_value"],
                meta=d.get("meta", d.get("metadata", {})),
                source=d.get("source"),
            )
            self.db.add(asset)
            assets.append(asset)
        self.db.commit()
        for a in assets:
            self.db.refresh(a)
        self._record_event(scan_id, AssetEventType.ASSET_ANALYSIS_COMPLETED, {
            "count": len(assets),
            "asset_types": list(set(a.asset_type.value for a in assets)),
        })
        return assets

    def get_asset(self, asset_id: str) -> Optional[Asset]:
        return self.db.query(Asset).filter(Asset.id == asset_id).first()

    def get_scan_assets(self, scan_id: str, filters: Optional[AssetFilter] = None) -> List[Asset]:
        query = self.db.query(Asset).filter(Asset.scan_id == scan_id)
        if filters:
            if filters.asset_type:
                query = query.filter(Asset.asset_type == filters.asset_type)
            if filters.source:
                query = query.filter(Asset.source == filters.source)
            if filters.search:
                query = query.filter(Asset.asset_value.ilike(f"%{filters.search}%"))
        return query.order_by(Asset.created_at.desc()).all()

    def update_asset(self, asset_id: str, data: AssetUpdate) -> Optional[Asset]:
        asset = self.get_asset(asset_id)
        if not asset:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(asset, field, value)
        self.db.commit()
        self.db.refresh(asset)
        self._record_event(asset.scan_id, AssetEventType.ASSET_UPDATED, {
            "asset_id": asset.id,
            "changes": list(update_data.keys()),
        })
        return asset

    def delete_asset(self, asset_id: str) -> bool:
        asset = self.get_asset(asset_id)
        if not asset:
            return False
        self.db.query(AssetGraphEdge).filter(
            (AssetGraphEdge.source_asset_id == asset_id) |
            (AssetGraphEdge.target_asset_id == asset_id)
        ).delete()
        self.db.query(AssetGraphNode).filter(
            AssetGraphNode.asset_id == asset_id
        ).delete()
        self.db.delete(asset)
        self.db.commit()
        return True

    def get_summary(self, scan_id: str) -> Dict[str, Any]:
        assets = self.db.query(Asset).filter(Asset.scan_id == scan_id).all()
        by_type: Dict[str, int] = {}
        by_source: Dict[str, int] = {}
        for a in assets:
            t = a.asset_type.value if hasattr(a.asset_type, "value") else str(a.asset_type)
            by_type[t] = by_type.get(t, 0) + 1
            s = a.source or "unknown"
            by_source[s] = by_source.get(s, 0) + 1
        return {
            "total_assets": len(assets),
            "by_type": by_type,
            "by_source": by_source,
        }

    def get_technologies(self, scan_id: str) -> Dict[str, Any]:
        tech_assets = self.db.query(Asset).filter(
            Asset.scan_id == scan_id,
            Asset.asset_type == AssetType.TECHNOLOGY
        ).all()
        technologies: Dict[str, int] = {}
        for t in tech_assets:
            name = t.asset_value
            technologies[name] = technologies.get(name, 0) + 1
        return {"technologies": technologies, "total": len(tech_assets)}

    async def run_asset_discovery(self, scan_id: str, target: str) -> Dict[str, Any]:
        self._record_event(scan_id, AssetEventType.ASSET_ANALYSIS_STARTED, {"target": target})
        orchestrator = AssetDiscoveryOrchestrator()
        discovery_results = await orchestrator.discover_all(target)
        all_assets = []
        for category, asset_list in discovery_results.items():
            for asset_dict in asset_list:
                asset_dict["scan_id"] = scan_id
                all_assets.append(asset_dict)
        assets = self.bulk_create_assets(scan_id, all_assets)
        await self._broadcast_discovery(scan_id, assets)
        graph_mgr = AssetGraphManager(self.db, scan_id)
        nodes, edges = graph_mgr.build_graph()
        logger.info(f"Asset discovery complete: {len(assets)} assets, {len(nodes)} nodes, {len(edges)} edges")
        return {
            "assets_count": len(assets),
            "nodes_count": len(nodes),
            "edges_count": len(edges),
        }

    def _record_event(self, scan_id: str, event_type: AssetEventType, payload: Dict[str, Any]):
        event = AssetEvent(
            id=str(uuid.uuid4()),
            scan_id=scan_id,
            event_type=event_type.value if hasattr(event_type, "value") else str(event_type),
            payload=payload,
        )
        self.db.add(event)
        self.db.commit()

    async def _broadcast_discovery(self, scan_id: str, assets: List[Asset]):
        summary = self.get_summary(scan_id)
        await manager.broadcast({
            "type": "asset_discovery_complete",
            "scan_id": scan_id,
            "summary": summary,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        })
