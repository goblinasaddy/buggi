import uuid
from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.sqlite import JSON
import datetime
import enum

from backend.database.db import Base


class AssetType(str, enum.Enum):
    DOMAIN = "domain"
    SUBDOMAIN = "subdomain"
    PAGE = "page"
    ENDPOINT = "endpoint"
    FORM = "form"
    PARAMETER = "parameter"
    JAVASCRIPT = "javascript"
    TECHNOLOGY = "technology"


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    asset_type = Column(SQLEnum(AssetType), nullable=False, index=True)
    asset_value = Column(String, nullable=False, index=True)
    meta = Column(JSON, nullable=True, default={})
    source = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="assets")
    graph_edges_from = relationship(
        "AssetGraphEdge",
        foreign_keys="AssetGraphEdge.source_asset_id",
        back_populates="source_asset"
    )
    graph_edges_to = relationship(
        "AssetGraphEdge",
        foreign_keys="AssetGraphEdge.target_asset_id",
        back_populates="target_asset"
    )


class AssetGraphNode(Base):
    __tablename__ = "asset_graph_nodes"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False, index=True)
    label = Column(String, nullable=True)
    meta = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="asset_graph_nodes")
    asset = relationship("Asset", back_populates="graph_nodes")
    edges_from = relationship(
        "AssetGraphEdge",
        foreign_keys="AssetGraphEdge.source_node_id",
        back_populates="source_node"
    )
    edges_to = relationship(
        "AssetGraphEdge",
        foreign_keys="AssetGraphEdge.target_node_id",
        back_populates="target_node"
    )


class AssetGraphEdge(Base):
    __tablename__ = "asset_graph_edges"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    source_node_id = Column(String, ForeignKey("asset_graph_nodes.id"), nullable=False, index=True)
    target_node_id = Column(String, ForeignKey("asset_graph_nodes.id"), nullable=False, index=True)
    source_asset_id = Column(String, ForeignKey("assets.id"), nullable=True, index=True)
    target_asset_id = Column(String, ForeignKey("assets.id"), nullable=True, index=True)
    relationship_type = Column(String, nullable=False, index=True)
    meta = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="asset_graph_edges")
    source_node = relationship(
        "AssetGraphNode",
        foreign_keys=[source_node_id],
        back_populates="edges_from"
    )
    target_node = relationship(
        "AssetGraphNode",
        foreign_keys=[target_node_id],
        back_populates="edges_to"
    )
    source_asset = relationship(
        "Asset",
        foreign_keys=[source_asset_id],
        back_populates="graph_edges_from"
    )
    target_asset = relationship(
        "Asset",
        foreign_keys=[target_asset_id],
        back_populates="graph_edges_to"
    )


class AssetEvent(Base):
    __tablename__ = "asset_events"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"), nullable=False, index=True)
    asset_id = Column(String, ForeignKey("assets.id"), nullable=True, index=True)
    event_type = Column(String, nullable=False, index=True)
    payload = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    scan = relationship("Scan", back_populates="asset_events")
    scan = relationship("Scan", back_populates="asset_events")
    asset = relationship("Asset", back_populates="events")

Asset.events = relationship("AssetEvent", back_populates="asset", order_by=AssetEvent.created_at)
Asset.graph_nodes = relationship("AssetGraphNode", back_populates="asset")