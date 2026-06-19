from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any, List
import datetime
from backend.assets.models import AssetType


class AssetBase(BaseModel):
    asset_type: AssetType
    asset_value: str
    meta: Optional[Dict[str, Any]] = {}
    source: Optional[str] = None


class AssetCreate(AssetBase):
    scan_id: str


class AssetUpdate(BaseModel):
    asset_type: Optional[AssetType] = None
    asset_value: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    source: Optional[str] = None


class AssetResponse(AssetBase):
    id: str
    scan_id: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AssetFilter(BaseModel):
    asset_type: Optional[AssetType] = None
    source: Optional[str] = None
    search: Optional[str] = None


class AssetGraphNodeBase(BaseModel):
    asset_id: str
    label: Optional[str] = None
    meta: Optional[Dict[str, Any]] = {}


class AssetGraphNodeCreate(AssetGraphNodeBase):
    scan_id: str


class AssetGraphNodeResponse(AssetGraphNodeBase):
    id: str
    scan_id: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AssetGraphEdgeBase(BaseModel):
    source_node_id: str
    target_node_id: str
    relationship_type: str
    meta: Optional[Dict[str, Any]] = {}


class AssetGraphEdgeCreate(AssetGraphEdgeBase):
    scan_id: str
    source_asset_id: Optional[str] = None
    target_asset_id: Optional[str] = None


class AssetGraphEdgeResponse(AssetGraphEdgeBase):
    id: str
    scan_id: str
    source_asset_id: Optional[str] = None
    target_asset_id: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AssetGraphResponse(BaseModel):
    nodes: List[AssetGraphNodeResponse]
    edges: List[AssetGraphEdgeResponse]


class AssetEventBase(BaseModel):
    scan_id: str
    asset_id: Optional[str] = None
    event_type: str
    payload: Optional[Dict[str, Any]] = {}


class AssetEventResponse(AssetEventBase):
    id: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class AssetSummaryResponse(BaseModel):
    total_assets: int
    by_type: Dict[str, int]
    by_source: Dict[str, int]


class TechnologySummaryResponse(BaseModel):
    technologies: Dict[str, int]
    total: int


class GraphStatisticsResponse(BaseModel):
    total_nodes: int
    total_edges: int
    connected_components: int
    max_depth: int