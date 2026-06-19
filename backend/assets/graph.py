from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from backend.assets.models import Asset, AssetGraphNode, AssetGraphEdge, AssetType
import logging

logger = logging.getLogger("buggi.assets.graph")


class AssetGraphManager:
    def __init__(self, db: Session, scan_id: str):
        self.db = db
        self.scan_id = scan_id

    def build_graph(self) -> Tuple[List[AssetGraphNode], List[AssetGraphEdge]]:
        assets = self.db.query(Asset).filter(Asset.scan_id == self.scan_id).all()
        domain_nodes = {}
        for asset in assets:
            node = AssetGraphNode(
                scan_id=self.scan_id,
                asset_id=asset.id,
                label=f"{asset.asset_type.value}: {asset.asset_value}",
                meta={"asset_type": asset.asset_type.value, "asset_value": asset.asset_value}
            )
            self.db.add(node)
            self.db.commit()
            domain_nodes[asset.id] = node
        edges = []
        asset_list = list(assets)
        for i, src in enumerate(asset_list):
            for j, dst in enumerate(asset_list):
                if i >= j:
                    continue
                rel = self._infer_relationship(src, dst)
                if rel:
                    edge = AssetGraphEdge(
                        scan_id=self.scan_id,
                        source_node_id=domain_nodes[src.id].id,
                        target_node_id=domain_nodes[dst.id].id,
                        source_asset_id=src.id,
                        target_asset_id=dst.id,
                        relationship_type=rel,
                        meta={}
                    )
                    self.db.add(edge)
                    self.db.commit()
                    edges.append(edge)
        nodes = list(domain_nodes.values())
        return nodes, edges

    def _infer_relationship(self, src: Asset, dst: Asset) -> Optional[str]:
        st, dt = src.asset_type, dst.asset_type
        mapping = {
            (AssetType.DOMAIN, AssetType.SUBDOMAIN): "has_subdomain",
            (AssetType.SUBDOMAIN, AssetType.PAGE): "has_page",
            (AssetType.SUBDOMAIN, AssetType.ENDPOINT): "has_endpoint",
            (AssetType.PAGE, AssetType.FORM): "has_form",
            (AssetType.PAGE, AssetType.JAVASCRIPT): "loads_script",
            (AssetType.ENDPOINT, AssetType.PARAMETER): "accepts_parameter",
            (AssetType.DOMAIN, AssetType.TECHNOLOGY): "uses_technology",
            (AssetType.SUBDOMAIN, AssetType.TECHNOLOGY): "uses_technology",
        }
        forward = mapping.get((st, dt))
        if forward:
            return forward
        reverse = mapping.get((dt, st))
        if reverse:
            return reverse
        return None

    def get_graph(self) -> Tuple[List[Dict], List[Dict]]:
        nodes = self.db.query(AssetGraphNode).filter(
            AssetGraphNode.scan_id == self.scan_id
        ).all()
        edges = self.db.query(AssetGraphEdge).filter(
            AssetGraphEdge.scan_id == self.scan_id
        ).all()
        nodes_data = [{
            "id": n.id,
            "asset_id": n.asset_id,
            "label": n.label,
            "meta": n.meta or {},
        } for n in nodes]
        edges_data = [{
            "id": e.id,
            "source": e.source_node_id,
            "target": e.target_node_id,
            "relationship": e.relationship_type,
            "meta": e.meta or {},
        } for e in edges]
        return nodes_data, edges_data

    def get_statistics(self) -> Dict:
        total_nodes = self.db.query(AssetGraphNode).filter(
            AssetGraphNode.scan_id == self.scan_id
        ).count()
        total_edges = self.db.query(AssetGraphEdge).filter(
            AssetGraphEdge.scan_id == self.scan_id
        ).count()
        adjacency = self._build_adjacency()
        components = self._count_components(adjacency)
        max_depth = self._max_depth(adjacency)
        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "connected_components": components,
            "max_depth": max_depth,
        }

    def _build_adjacency(self) -> Dict[str, Set[str]]:
        edges = self.db.query(AssetGraphEdge).filter(
            AssetGraphEdge.scan_id == self.scan_id
        ).all()
        adj: Dict[str, Set[str]] = {}
        for e in edges:
            adj.setdefault(e.source_node_id, set()).add(e.target_node_id)
            adj.setdefault(e.target_node_id, set()).add(e.source_node_id)
        return adj

    def _count_components(self, adjacency: Dict[str, Set[str]]) -> int:
        visited: Set[str] = set()
        components = 0
        for node in adjacency:
            if node not in visited:
                components += 1
                stack = [node]
                while stack:
                    current = stack.pop()
                    if current not in visited:
                        visited.add(current)
                        for neighbor in adjacency.get(current, set()):
                            if neighbor not in visited:
                                stack.append(neighbor)
        return components

    def _max_depth(self, adjacency: Dict[str, Set[str]]) -> int:
        if not adjacency:
            return 0
        max_depth = 0
        for start in adjacency:
            visited: Set[str] = set()
            stack = [(start, 0)]
            while stack:
                node, depth = stack.pop()
                max_depth = max(max_depth, depth)
                if node not in visited:
                    visited.add(node)
                    for neighbor in adjacency.get(node, set()):
                        if neighbor not in visited:
                            stack.append((neighbor, depth + 1))
        return max_depth
