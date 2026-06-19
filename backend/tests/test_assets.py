import pytest
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.database.db import Base
from backend.database.models import Scan, ProgramProfile
from backend.assets.models import Asset, AssetType, AssetGraphNode, AssetGraphEdge, AssetEvent
from backend.assets.schemas import AssetCreate, AssetUpdate, AssetFilter
from backend.assets.service import AssetService
from backend.assets.graph import AssetGraphManager
from backend.assets.providers import (
    DomainDiscoveryProvider, PageCrawlProvider, EndpointDiscoveryProvider,
    TechnologyDiscoveryProvider, JavaScriptDiscoveryProvider, AssetDiscoveryOrchestrator,
)

TEST_DB_FILE = "test_assets_buggi.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        engine.dispose()
        Base.metadata.drop_all(bind=engine)
        import gc
        gc.collect()
        for i in range(3):
            try:
                if os.path.exists(TEST_DB_FILE):
                    os.remove(TEST_DB_FILE)
                break
            except PermissionError:
                import time
                time.sleep(0.5)


@pytest.fixture
def scan(db_session):
    import uuid
    profile = ProgramProfile(
        program_name=f"Asset Test Profile {uuid.uuid4().hex[:8]}",
        allowed_tests=["Recon"],
        prohibited_tests=["DoS"],
    )
    db_session.add(profile)
    db_session.commit()
    scan = Scan(
        target_url="http://asset-test.local",
        profile_id=profile.id,
        scan_type="full",
        status="pending",
    )
    db_session.add(scan)
    db_session.commit()
    return scan


class TestAssetModel:
    def test_create_asset(self, db_session, scan):
        asset = Asset(
            id=str(uuid.uuid4()),
            scan_id=scan.id,
            asset_type=AssetType.DOMAIN,
            asset_value="example.com",
            meta={"source": "test"},
            source="test",
        )
        db_session.add(asset)
        db_session.commit()
        assert asset.id is not None
        assert asset.asset_type == AssetType.DOMAIN
        assert asset.asset_value == "example.com"

    def test_asset_relationships(self, db_session, scan):
        domain = Asset(
            id=str(uuid.uuid4()), scan_id=scan.id,
            asset_type=AssetType.DOMAIN, asset_value="test.com",
        )
        subdomain = Asset(
            id=str(uuid.uuid4()), scan_id=scan.id,
            asset_type=AssetType.SUBDOMAIN, asset_value="api.test.com",
        )
        db_session.add_all([domain, subdomain])
        db_session.commit()
        assert domain in db_session.query(Asset).all()
        assert subdomain in db_session.query(Asset).all()


class TestAssetService:
    def test_create_and_get_asset(self, db_session, scan):
        service = AssetService(db_session)
        data = AssetCreate(
            scan_id=scan.id,
            asset_type=AssetType.ENDPOINT,
            asset_value="https://api.test.com/v1/users",
            meta={"methods": ["GET", "POST"]},
            source="test",
        )
        asset = service.create_asset(data)
        assert asset.id is not None
        assert asset.asset_value == "https://api.test.com/v1/users"
        fetched = service.get_asset(asset.id)
        assert fetched is not None
        assert fetched.id == asset.id

    def test_bulk_create_assets(self, db_session, scan):
        service = AssetService(db_session)
        asset_dicts = [
            {"asset_type": AssetType.PAGE, "asset_value": "https://test.com/", "source": "crawl"},
            {"asset_type": AssetType.PAGE, "asset_value": "https://test.com/login", "source": "crawl"},
            {"asset_type": AssetType.FORM, "asset_value": "https://test.com/login", "source": "crawl"},
        ]
        assets = service.bulk_create_assets(scan.id, asset_dicts)
        assert len(assets) == 3
        for a in assets:
            assert a.scan_id == scan.id

    def test_update_asset(self, db_session, scan):
        service = AssetService(db_session)
        data = AssetCreate(
            scan_id=scan.id, asset_type=AssetType.TECHNOLOGY,
            asset_value="Nginx", meta={}, source="fingerprint",
        )
        asset = service.create_asset(data)
        update = AssetUpdate(meta={"version": "1.24.0", "category": "web_server"})
        updated = service.update_asset(asset.id, update)
        assert updated is not None
        assert updated.meta["version"] == "1.24.0"

    def test_delete_asset(self, db_session, scan):
        service = AssetService(db_session)
        data = AssetCreate(
            scan_id=scan.id, asset_type=AssetType.JAVASCRIPT,
            asset_value="https://test.com/app.js", source="js_discovery",
        )
        asset = service.create_asset(data)
        assert service.delete_asset(asset.id) is True
        assert service.get_asset(asset.id) is None

    def test_get_summary(self, db_session, scan):
        service = AssetService(db_session)
        service.bulk_create_assets(scan.id, [
            {"asset_type": AssetType.DOMAIN, "asset_value": "test.com", "source": "input"},
            {"asset_type": AssetType.SUBDOMAIN, "asset_value": "api.test.com", "source": "dns"},
            {"asset_type": AssetType.TECHNOLOGY, "asset_value": "Python", "source": "fingerprint"},
        ])
        summary = service.get_summary(scan.id)
        assert summary["total_assets"] >= 3
        assert "domain" in summary["by_type"]
        assert summary["by_source"].get("input", 0) >= 1

    def test_get_technologies(self, db_session, scan):
        service = AssetService(db_session)
        service.bulk_create_assets(scan.id, [
            {"asset_type": AssetType.TECHNOLOGY, "asset_value": "FastAPI", "source": "fingerprint"},
            {"asset_type": AssetType.TECHNOLOGY, "asset_value": "Python", "source": "fingerprint"},
        ])
        tech = service.get_technologies(scan.id)
        assert tech["total"] >= 2
        assert "FastAPI" in tech["technologies"]

    def test_asset_filtering(self, db_session, scan):
        service = AssetService(db_session)
        service.bulk_create_assets(scan.id, [
            {"asset_type": AssetType.PAGE, "asset_value": "https://test.com/", "source": "crawl"},
            {"asset_type": AssetType.ENDPOINT, "asset_value": "https://api.test.com/v1", "source": "discovery"},
            {"asset_type": AssetType.PARAMETER, "asset_value": "id", "source": "discovery"},
        ])
        filters = AssetFilter(asset_type=AssetType.ENDPOINT)
        results = service.get_scan_assets(scan.id, filters)
        assert all(a.asset_type == AssetType.ENDPOINT for a in results)

    def test_run_asset_discovery(self, db_session, scan):
        service = AssetService(db_session)
        import asyncio
        result = asyncio.run(service.run_asset_discovery(scan.id, "http://test.local"))
        assert result["assets_count"] > 0
        assert result["nodes_count"] > 0
        assert result["edges_count"] > 0
        summary = service.get_summary(scan.id)
        assert summary["total_assets"] > 0


class TestAssetGraph:
    def test_graph_building(self, db_session, scan):
        service = AssetService(db_session)
        import asyncio
        asyncio.run(service.run_asset_discovery(scan.id, "http://graph-test.local"))
        mgr = AssetGraphManager(db_session, scan.id)
        stats = mgr.get_statistics()
        assert stats["total_nodes"] > 0
        assert stats["total_edges"] >= 0
        assert stats["connected_components"] >= 1

    def test_graph_rebuild(self, db_session, scan):
        service = AssetService(db_session)
        import asyncio
        asyncio.run(service.run_asset_discovery(scan.id, "http://rebuild-test.local"))
        db_session.query(AssetGraphNode).filter(AssetGraphNode.scan_id == scan.id).delete()
        db_session.query(AssetGraphEdge).filter(AssetGraphEdge.scan_id == scan.id).delete()
        db_session.commit()
        mgr = AssetGraphManager(db_session, scan.id)
        nodes, edges = mgr.build_graph()
        assert len(nodes) > 0

    def test_graph_statistics(self, db_session, scan):
        mgr = AssetGraphManager(db_session, scan.id)
        stats = mgr.get_statistics()
        assert "total_nodes" in stats
        assert "total_edges" in stats
        assert "connected_components" in stats
        assert "max_depth" in stats


class TestAssetProviders:
    @pytest.mark.asyncio
    async def test_domain_discovery(self):
        provider = DomainDiscoveryProvider(use_mock=True)
        results = await provider.discover("http://example.com")
        assert len(results) >= 1
        assert any(r["asset_type"] == AssetType.DOMAIN for r in results)

    @pytest.mark.asyncio
    async def test_page_crawl(self):
        provider = PageCrawlProvider(use_mock=True)
        results = await provider.discover("http://example.com")
        assert len(results) >= 1
        assert any(r["asset_type"] == AssetType.PAGE for r in results)

    @pytest.mark.asyncio
    async def test_endpoint_discovery(self):
        provider = EndpointDiscoveryProvider(use_mock=True)
        results = await provider.discover("http://example.com")
        assert len(results) >= 1
        assert any(r["asset_type"] == AssetType.ENDPOINT for r in results)

    @pytest.mark.asyncio
    async def test_technology_discovery(self):
        provider = TechnologyDiscoveryProvider(use_mock=True)
        results = await provider.discover("http://example.com")
        assert len(results) >= 1
        assert any(r["asset_type"] == AssetType.TECHNOLOGY for r in results)

    @pytest.mark.asyncio
    async def test_javascript_discovery(self):
        provider = JavaScriptDiscoveryProvider(use_mock=True)
        results = await provider.discover("http://example.com")
        assert len(results) >= 1
        assert any(r["asset_type"] == AssetType.JAVASCRIPT for r in results)

    @pytest.mark.asyncio
    async def test_orchestrator(self):
        orchestrator = AssetDiscoveryOrchestrator()
        results = await orchestrator.discover_all("http://example.com")
        assert "domains" in results
        assert "pages" in results
        assert "endpoints" in results
        assert "technologies" in results
        assert "javascript" in results
        total = sum(len(v) for v in results.values())
        assert total > 0


class TestAssetEvents:
    def test_asset_events_created(self, db_session, scan):
        service = AssetService(db_session)
        data = AssetCreate(
            scan_id=scan.id, asset_type=AssetType.PAGE,
            asset_value="https://test.com/events", source="crawl",
        )
        asset = service.create_asset(data)
        events = db_session.query(AssetEvent).filter(
            AssetEvent.scan_id == scan.id
        ).all()
        assert len(events) >= 1
        matching = [e for e in events if e.payload and "asset_id" in e.payload]
        assert any(e.payload["asset_id"] == asset.id for e in matching)
