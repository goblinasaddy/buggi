import asyncio
import datetime
import random
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from backend.database.models import Scan, ScanEvent, ScanGraphNode, ScanGraphEdge, Finding, Report
from backend.agents.events import EventType
from backend.websocket.manager import manager
from backend.reports.manager import LocalReportManager
import logging

logger = logging.getLogger("buggi.simulator")

class SimulatorEngine:
    def __init__(self, db: Session, scan_id: str):
        self.db = db
        self.scan_id = scan_id

    async def log_event(self, event_type: Any, agent: str, message: str, payload: Optional[Dict[str, Any]] = None):
        """Helper to store event in DB, log locally, and broadcast via WS."""
        # Retrieve string value of event
        event_str = event_type.value if hasattr(event_type, "value") else str(event_type)

        # Save to database
        db_event = ScanEvent(
            scan_id=self.scan_id,
            event_type=event_str,
            agent=agent,
            message=message,
            payload=payload
        )
        self.db.add(db_event)
        self.db.commit()

        # Broadcast via WebSocket
        await manager.broadcast({
            "type": "event",
            "scan_id": self.scan_id,
            "event_type": event_str,
            "agent": agent,
            "message": message,
            "payload": payload,
            "created_at": datetime.datetime.utcnow().isoformat()
        }, scan_id=self.scan_id)
        
        logger.info(f"[{agent} Agent] {message}")

    def add_graph_node(self, type_name: str, label: str, url: str = None, method: str = None, metadata: dict = None) -> str:
        """Adds a node to the attack surface graph in DB and returns its id."""
        node = ScanGraphNode(
            scan_id=self.scan_id,
            type=type_name,
            label=label,
            url=url,
            method=method,
            metadata_json=metadata
        )
        self.db.add(node)
        self.db.commit()
        return node.id

    def add_graph_edge(self, source_id: str, target_id: str, label: str = None):
        """Adds an edge linking two graph nodes."""
        edge = ScanGraphEdge(
            scan_id=self.scan_id,
            source_id=source_id,
            target_id=target_id,
            label=label
        )
        self.db.add(edge)
        self.db.commit()

    async def send_graph_update(self):
        """Emits the latest graph via WebSocket so the frontend can draw it in real-time."""
        # Query all nodes and edges for this scan
        nodes = self.db.query(ScanGraphNode).filter(ScanGraphNode.scan_id == self.scan_id).all()
        edges = self.db.query(ScanGraphEdge).filter(ScanGraphEdge.scan_id == self.scan_id).all()

        nodes_data = [{
            "id": n.id,
            "type": n.type,
            "label": n.label,
            "url": n.url,
            "method": n.method,
            "metadata": n.metadata_json
        } for n in nodes]

        edges_data = [{
            "id": e.id,
            "source": e.source_id,
            "target": e.target_id,
            "label": e.label
        } for e in edges]

        await manager.broadcast({
            "type": "graph_update",
            "scan_id": self.scan_id,
            "nodes": nodes_data,
            "edges": edges_data
        }, scan_id=self.scan_id)

    async def run(self):
        """Simulates all agents running step-by-step, generating and verifying findings."""
        scan = self.db.query(Scan).filter(Scan.id == self.scan_id).first()
        if not scan:
            logger.error(f"Scan {self.scan_id} not found in DB.")
            return

        target_url = scan.target_url
        profile_name = scan.profile.program_name if scan.profile else "Generic Web App"

        # Update Scan Status to running
        scan.status = "running"
        self.db.commit()

        await self.log_event(EventType.SCAN_STARTED, "System", f"Initiating {scan.scan_type} scan on {target_url} using '{profile_name}' profile.")
        await asyncio.sleep(2)

        # -------------------- RECON AGENT --------------------
        await self.log_event(EventType.RECON_STARTED, "Recon", f"Running subdomain discovery and fingerprinting via subfinder / httpx...")
        await asyncio.sleep(2.5)

        # Build initial graph node
        root_node_id = self.add_graph_node("domain", target_url, url=target_url)
        await self.send_graph_update()

        # Simulate hosts found
        domain_clean = target_url.replace("https://", "").replace("http://", "").split("/")[0]
        hosts = [f"api.{domain_clean}", f"assets.{domain_clean}", f"auth.{domain_clean}"]
        host_node_ids = []

        for host in hosts:
            node_id = self.add_graph_node("domain", host, url=f"https://{host}")
            self.add_graph_edge(root_node_id, node_id, label="subdomain")
            host_node_ids.append(node_id)
            await self.log_event(EventType.RECON_HOST_FOUND, "Recon", f"Identified host: {host} (IP resolved, tech stack: Cloudflare, Nginx)", {"host": host})
            await self.send_graph_update()
            await asyncio.sleep(1.5)

        # -------------------- BROWSER AGENT --------------------
        await self.log_event(EventType.BROWSER_CRAWL_STARTED, "Browser", "Spinning up Playwright browser context to map user workflows...")
        await asyncio.sleep(2.5)

        # Add endpoints mapping
        api_host_node = host_node_ids[0]  # api.domain
        endpoints = [
            ("/api/v1/user/profile", "GET"),
            ("/api/v1/user/settings", "POST"),
            ("/api/v1/admin/dashboard", "GET"),
            ("/api/v1/posts/1001", "GET")
        ]
        endpoint_node_ids = []

        for endpoint, method in endpoints:
            full_url = f"https://api.{domain_clean}{endpoint}"
            node_id = self.add_graph_node("url", f"{method} {endpoint}", url=full_url, method=method)
            self.add_graph_edge(api_host_node, node_id, label="endpoint")
            endpoint_node_ids.append(node_id)
            
            # Detect forms
            if method == "POST":
                await self.log_event(EventType.BROWSER_FORM_DISCOVERED, "Browser", f"Discovered interactive form at {endpoint} accepting inputs: [email, username, password]", {"url": full_url, "inputs": ["email", "username", "password"]})
            else:
                await self.log_event(EventType.BROWSER_CRAWL_STARTED, "Browser", f"Mapped route: {endpoint} ({method})")

            await self.send_graph_update()
            await asyncio.sleep(1.5)

        # -------------------- API AGENT --------------------
        await self.log_event(EventType.API_DISCOVERED, "API", f"Interrogating parameters and mapping REST API patterns for target: {target_url}")
        await asyncio.sleep(2.5)

        # Add api endpoints and params to the graph
        post_endpoint_node = endpoint_node_ids[1]  # POST /api/v1/user/settings
        param_node_id = self.add_graph_node("parameter", "id (Numeric)", metadata={"type": "query_param"})
        self.add_graph_edge(post_endpoint_node, param_node_id, label="accepts")
        await self.send_graph_update()
        await asyncio.sleep(1)

        # -------------------- TESTING FOR VULNERABILITY (POTENTIAL) --------------------
        potential_idor_url = f"https://api.{domain_clean}/api/v1/posts/1001"
        await self.log_event(
            EventType.POTENTIAL_VULNERABILITY,
            "API",
            f"Potential IDOR detected at endpoint /api/v1/posts/1001. Parameter '1001' responded with user details of another object when requested under different auth context.",
            {"url": potential_idor_url, "parameter": "1001", "vulnerability": "IDOR"}
        )
        await asyncio.sleep(3.0)

        # Save artifact of raw request/response log
        req_res_log = {
            "request": {
                "method": "GET",
                "url": potential_idor_url,
                "headers": {
                    "Authorization": "Bearer token_user_A",
                    "Accept": "application/json"
                }
            },
            "response": {
                "status": 200,
                "body": {
                    "id": 1001,
                    "title": "Private Draft post",
                    "owner": "user_B_uuid",
                    "content": "Secret vulnerability writeup notes."
                }
            }
        }
        artifact_path = LocalReportManager.save_artifact(self.scan_id, "idor_poc_log", req_res_log, ext="json")
        await self.log_event("SYSTEM_INFO", "API", f"Saved RAW proof-of-concept logs to artifact path: {artifact_path}")
        await asyncio.sleep(1.5)

        # -------------------- VERIFICATION AGENT --------------------
        await self.log_event(EventType.VULNERABILITY_VERIFIED, "Verification", "Verification agent active. Replaying request with unauthorized tokens to confirm IDOR...")
        await asyncio.sleep(2.5)

        # Confirm the bug
        finding_title = "Insecure Direct Object Reference (IDOR) on /api/v1/posts/[id]"
        finding = Finding(
            scan_id=self.scan_id,
            severity="high",
            title=finding_title,
            status="verified",
            confidence=0.95,
            target=potential_idor_url,
            evidence=req_res_log
        )
        self.db.add(finding)
        self.db.commit()

        await self.log_event(
            EventType.VULNERABILITY_VERIFIED,
            "Verification",
            f"IDOR verified! Severity: HIGH. Response diff confirms data disclosure of Owner user_B_uuid.",
            {"finding_id": finding.id, "severity": "high", "title": finding_title}
        )
        await asyncio.sleep(2)

        # -------------------- REPORT AGENT --------------------
        await self.log_event(EventType.REPORT_GENERATED, "Report", "Report Agent compiling markdown report and exporting JSON structures...")
        await asyncio.sleep(2.0)

        # Generate local files
        findings_list = [{
            "title": finding.title,
            "severity": finding.severity,
            "status": finding.status,
            "confidence": finding.confidence,
            "target": finding.target,
            "evidence": finding.evidence
        }]
        
        report_paths = LocalReportManager.generate_report(self.scan_id, target_url, findings_list, profile_name)
        
        # Save Report in Database
        db_report = Report(
            scan_id=self.scan_id,
            title=f"Buggi Assessment Report - {target_url}",
            file_path=report_paths["markdown_path"],
            format="markdown"
        )
        self.db.add(db_report)
        self.db.commit()

        await self.log_event(
            EventType.REPORT_GENERATED,
            "Report",
            f"Generated markdown report saved at: {report_paths['markdown_path']}",
            {"markdown_report": report_paths['markdown_filename'], "json_report": report_paths['json_filename']}
        )
        await asyncio.sleep(1.5)

        # -------------------- SCAN COMPLETED --------------------
        scan.status = "completed"
        scan.completed_at = datetime.datetime.utcnow()
        self.db.commit()
        await self.log_event(EventType.SCAN_COMPLETED, "System", "Autonomous assessment finished. Target is successfully mapped and findings are generated.")
