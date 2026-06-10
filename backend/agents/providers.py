from typing import Any, Dict, List
from backend.agents.interfaces import ILLMProvider, IAgentProvider, IMemoryProvider, IToolProvider

class MockLLMProvider(ILLMProvider):
    def generate(self, prompt: str, system_prompt: str = None, **kwargs) -> str:
        return f"[Mock RavenX response for prompt: {prompt[:30]}...]"

class MockAgentProvider(IAgentProvider):
    def execute_task(self, agent_name: str, task: str, context: Dict[str, Any]) -> Dict[str, Any]:
        return {"agent": agent_name, "status": "success", "result": f"Executed task: {task}"}

class MockMemoryProvider(IMemoryProvider):
    def __init__(self):
        self._store = {}

    def retrieve(self, key: str) -> Any:
        return self._store.get(key)

    def store(self, key: str, value: Any, ttl: int = None):
        self._store[key] = value

class MockToolProvider(IToolProvider):
    def run(self, tool_name: str, arguments: List[str], target: str) -> Dict[str, Any]:
        return {"tool": tool_name, "success": True, "output": f"Mock execution of {tool_name} on {target}"}
