from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from backend.database.db import get_db
from backend.assets.models import Asset, AssetGraphNode, AssetGraphEdge
from backend.assets.schemas import (
    AssetCreate, AssetResponse, AssetUpdate, AssetFilter,
    AssetGraphResponse, AssetSummaryResponse,
    TechnologySummaryResponse, GraphStatisticsResponse,
    AssetGraphNodeResponse, AssetGraphEdgeResponse,
)
from backend.assets.service import AssetService
from backend.assets.graph import AssetGraphManager
import logging

logger = logging.getLogger("buggi.api.assets")

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.post("/", response_model=AssetResponse, status_code=201)
def create_asset(data: AssetCreate, db: Session = Depends(get_db)):
    service = AssetService(db)
    asset = service.create_asset(data)
    return asset


@router.get("/", response_model=List[AssetResponse])
def list_assets(
    scan_id: str = Query(..., description="Filter by scan ID"),
    asset_type: Optional[str] = Query(None, description="Filter by asset type"),
    source: Optional[str] = Query(None, description="Filter by source"),
    search: Optional[str] = Query(None, description="Search in asset value"),
    db: Session = Depends(get_db),
):
    filters = AssetFilter(asset_type=asset_type, source=source, search=search)
    service = AssetService(db)
    return service.get_scan_assets(scan_id, filters)


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    service = AssetService(db)
    asset = service.get_asset(asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: str, data: AssetUpdate, db: Session = Depends(get_db)):
    service = AssetService(db)
    asset = service.update_asset(asset_id, data)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    service = AssetService(db)
    if not service.delete_asset(asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")


@router.get("/{scan_id}/summary", response_model=AssetSummaryResponse)
def get_asset_summary(scan_id: str, db: Session = Depends(get_db)):
    service = AssetService(db)
    return service.get_summary(scan_id)


@router.get("/{scan_id}/technologies", response_model=TechnologySummaryResponse)
def get_technologies(scan_id: str, db: Session = Depends(get_db)):
    service = AssetService(db)
    return service.get_technologies(scan_id)


@router.post("/{scan_id}/discover")
async def discover_assets(scan_id: str, target: str = Query(...), db: Session = Depends(get_db)):
    from backend.database.models import Scan
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    service = AssetService(db)
    result = await service.run_asset_discovery(scan_id, target)
    return result


@router.get("/{scan_id}/graph", response_model=GraphStatisticsResponse)
def get_graph_statistics(scan_id: str, db: Session = Depends(get_db)):
    mgr = AssetGraphManager(db, scan_id)
    return mgr.get_statistics()


@router.get("/{scan_id}/graph/data", response_model=AssetGraphResponse)
def get_graph_data(scan_id: str, db: Session = Depends(get_db)):
    mgr = AssetGraphManager(db, scan_id)
    nodes, edges = mgr.get_graph()
    nodes_resp = [AssetGraphNodeResponse(
        id=n["id"], scan_id=scan_id, asset_id=n["asset_id"],
        label=n["label"], meta=n["meta"], created_at=None
    ) for n in nodes]
    edges_resp = [AssetGraphEdgeResponse(
        id=e["id"], scan_id=scan_id,
        source_node_id=e["source"], target_node_id=e["target"],
        relationship_type=e["relationship"],
        meta=e["meta"], created_at=None
    ) for e in edges]
    return AssetGraphResponse(nodes=nodes_resp, edges=edges_resp)


@router.post("/{scan_id}/graph/rebuild")
def rebuild_graph(scan_id: str, db: Session = Depends(get_db)):
    db.query(AssetGraphNode).filter(AssetGraphNode.scan_id == scan_id).delete()
    db.query(AssetGraphEdge).filter(AssetGraphEdge.scan_id == scan_id).delete()
    db.commit()
    mgr = AssetGraphManager(db, scan_id)
    nodes, edges = mgr.build_graph()
    return {"nodes_created": len(nodes), "edges_created": len(edges)}
