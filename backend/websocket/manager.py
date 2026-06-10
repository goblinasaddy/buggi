from fastapi import WebSocket
from typing import List, Dict, Set
import json
import logging

logger = logging.getLogger("buggi.websocket")

class ConnectionManager:
    def __init__(self):
        # Maps scan_id to active WebSockets, or "global" for general pet/dashboard updates
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "global": set()
        }

    async def connect(self, websocket: WebSocket, scan_id: str = "global"):
        await websocket.accept()
        if scan_id not in self.active_connections:
            self.active_connections[scan_id] = set()
        self.active_connections[scan_id].add(websocket)
        logger.info(f"WebSocket client connected to channel: {scan_id}")

    def disconnect(self, websocket: WebSocket, scan_id: str = "global"):
        if scan_id in self.active_connections:
            self.active_connections[scan_id].discard(websocket)
            # Clean up empty sets
            if len(self.active_connections[scan_id]) == 0 and scan_id != "global":
                del self.active_connections[scan_id]
        logger.info(f"WebSocket client disconnected from channel: {scan_id}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict, scan_id: str = "global"):
        # We also send all scan-specific messages to the global channel so the dashboard stays updated
        channels_to_send = {scan_id, "global"}
        
        # Serialize the message once
        message_str = json.dumps(message)
        
        for ch in channels_to_send:
            if ch in self.active_connections:
                # Iterate over a copy of the set to avoid modification issues during iteration
                for connection in list(self.active_connections[ch]):
                    try:
                        await connection.send_text(message_str)
                    except Exception as e:
                        logger.error(f"Error sending WebSocket message to {ch}: {e}")
                        # Auto disconnect stale connections
                        self.disconnect(connection, ch)

# Global connection manager instance
manager = ConnectionManager()
