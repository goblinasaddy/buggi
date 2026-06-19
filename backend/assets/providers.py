import abc
import asyncio
import random
from typing import Dict, Any, List, Optional, Set
from urllib.parse import urljoin, urlparse
from backend.assets.models import AssetType
import logging

logger = logging.getLogger("buggi.assets.providers")


class BaseAssetProvider(abc.ABC):
    @abc.abstractmethod
    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        pass


class MockAssetProvider(BaseAssetProvider):
    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        await asyncio.sleep(0)
        return []


class DomainDiscoveryProvider(BaseAssetProvider):
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        if self.use_mock:
            return await self._mock_discover(target)
        return await self._real_discover(target)

    async def _mock_discover(self, target: str) -> List[Dict[str, Any]]:
        parsed = urlparse(target)
        domain = parsed.netloc or parsed.path
        assets = []
        assets.append({
            "asset_type": AssetType.DOMAIN,
            "asset_value": domain,
            "metadata": {"source": "user_input", "original_url": target},
            "source": "user_input"
        })
        subdomains = [f"www.{domain}", f"api.{domain}", f"admin.{domain}", f"mail.{domain}"]
        for sd in subdomains:
            assets.append({
                "asset_type": AssetType.SUBDOMAIN,
                "asset_value": sd,
                "metadata": {"resolved": True, "ip": f"192.168.1.{random.randint(1, 254)}"},
                "source": "dns_enumeration"
            })
        return assets


class PageCrawlProvider(BaseAssetProvider):
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        if self.use_mock:
            return await self._mock_discover(target)
        return await self._real_discover(target)

    async def _mock_discover(self, target: str) -> List[Dict[str, Any]]:
        parsed = urlparse(target)
        domain = parsed.netloc or parsed.path
        base = f"https://{domain}"
        assets = []
        pages = [
            {"path": "/", "title": "Home"},
            {"path": "/login", "title": "Login"},
            {"path": "/dashboard", "title": "Dashboard"},
            {"path": "/about", "title": "About"},
            {"path": "/contact", "title": "Contact"},
        ]
        for page in pages:
            full_url = urljoin(base, page["path"])
            assets.append({
                "asset_type": AssetType.PAGE,
                "asset_value": full_url,
                "metadata": {"title": page["title"], "status_code": 200, "content_length": random.randint(1000, 50000)},
                "source": "page_crawl"
            })
        forms = ["/login", "/contact"]
        for form_path in forms:
            form_url = urljoin(base, form_path)
            assets.append({
                "asset_type": AssetType.FORM,
                "asset_value": form_url,
                "metadata": {"method": "POST", "inputs": ["email", "password", "csrf_token"]},
                "source": "page_crawl"
            })
        return assets


class EndpointDiscoveryProvider(BaseAssetProvider):
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        if self.use_mock:
            return await self._mock_discover(target)
        return await self._real_discover(target)

    async def _mock_discover(self, target: str) -> List[Dict[str, Any]]:
        parsed = urlparse(target)
        domain = parsed.netloc or parsed.path
        base = f"https://api.{domain}"
        assets = []
        endpoints_data = [
            ("/api/v1/users", ["GET", "POST"]),
            ("/api/v1/users/{id}", ["GET", "PUT", "DELETE"]),
            ("/api/v1/posts", ["GET", "POST"]),
            ("/api/v1/posts/{id}", ["GET", "PUT", "DELETE"]),
            ("/api/v1/auth/login", ["POST"]),
            ("/api/v1/auth/register", ["POST"]),
            ("/api/v1/admin/users", ["GET"]),
            ("/api/v1/health", ["GET"]),
        ]
        for endpoint, methods in endpoints_data:
            full_url = urljoin(base, endpoint)
            assets.append({
                "asset_type": AssetType.ENDPOINT,
                "asset_value": full_url,
                "metadata": {"methods": methods, "auth_required": "GET" not in methods or endpoint.startswith("/api/v1/admin")},
                "source": "endpoint_discovery"
            })
        parameters = ["id", "page", "limit", "sort", "filter", "search", "token"]
        for param in parameters:
            assets.append({
                "asset_type": AssetType.PARAMETER,
                "asset_value": param,
                "metadata": {"type": "query", "seen_in": ["/api/v1/users", "/api/v1/posts"]},
                "source": "endpoint_discovery"
            })
        return assets


class TechnologyDiscoveryProvider(BaseAssetProvider):
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        if self.use_mock:
            return await self._mock_discover(target)
        return await self._real_discover(target)

    async def _mock_discover(self, target: str) -> List[Dict[str, Any]]:
        assets = []
        technologies = [
            {"name": "Next.js", "category": "framework", "version": "14.0.4"},
            {"name": "Tailwind CSS", "category": "css_framework", "version": "3.4.0"},
            {"name": "Nginx", "category": "web_server", "version": "1.24.0"},
            {"name": "Python", "category": "language", "version": "3.11"},
            {"name": "FastAPI", "category": "framework", "version": "0.109.0"},
            {"name": "PostgreSQL", "category": "database", "version": "16.0"},
            {"name": "Redis", "category": "cache", "version": "7.2"},
        ]
        for tech in technologies:
            assets.append({
                "asset_type": AssetType.TECHNOLOGY,
                "asset_value": tech["name"],
                "metadata": {"category": tech["category"], "version": tech["version"], "confidence": random.uniform(0.7, 1.0)},
                "source": "technology_fingerprint"
            })
        return assets


class JavaScriptDiscoveryProvider(BaseAssetProvider):
    def __init__(self, use_mock: bool = True):
        self.use_mock = use_mock

    async def discover(self, target: str, **kwargs) -> List[Dict[str, Any]]:
        if self.use_mock:
            return await self._mock_discover(target)
        return await self._real_discover(target)

    async def _mock_discover(self, target: str) -> List[Dict[str, Any]]:
        parsed = urlparse(target)
        domain = parsed.netloc or parsed.path
        base = f"https://{domain}"
        assets = []
        js_files = [
            "/static/js/main.a1b2c3.js",
            "/static/js/chunk-vendors.d4e5f6.js",
            "/static/js/admin.789abc.js",
            "/_next/static/chunks/pages/index.xyz123.js",
        ]
        for js_path in js_files:
            full_url = urljoin(base, js_path)
            assets.append({
                "asset_type": AssetType.JAVASCRIPT,
                "asset_value": full_url,
                "metadata": {"size_bytes": random.randint(5000, 200000), "discovered_endpoints": ["/api/v1/", "/api/v2/"]},
                "source": "javascript_analysis"
            })
        return assets


class AssetDiscoveryOrchestrator:
    def __init__(
        self,
        domain_provider: Optional[BaseAssetProvider] = None,
        page_provider: Optional[BaseAssetProvider] = None,
        endpoint_provider: Optional[BaseAssetProvider] = None,
        tech_provider: Optional[BaseAssetProvider] = None,
        js_provider: Optional[BaseAssetProvider] = None,
    ):
        self.domain_provider = domain_provider or DomainDiscoveryProvider(use_mock=True)
        self.page_provider = page_provider or PageCrawlProvider(use_mock=True)
        self.endpoint_provider = endpoint_provider or EndpointDiscoveryProvider(use_mock=True)
        self.tech_provider = tech_provider or TechnologyDiscoveryProvider(use_mock=True)
        self.js_provider = js_provider or JavaScriptDiscoveryProvider(use_mock=True)

    async def discover_all(self, target: str) -> Dict[str, List[Dict[str, Any]]]:
        results = {}
        results["domains"] = await self.domain_provider.discover(target)
        results["pages"] = await self.page_provider.discover(target)
        results["endpoints"] = await self.endpoint_provider.discover(target)
        results["technologies"] = await self.tech_provider.discover(target)
        results["javascript"] = await self.js_provider.discover(target)
        return results
