from abc import ABC, abstractmethod
from typing import Any, Dict, List

class ILLMProvider(ABC):
    """Interface for LLM model integration (e.g. RavenX, GPT-4, etc.)"""
    @abstractmethod
    def generate(self, prompt: str, system_prompt: str = None, **kwargs) -> str:
        pass

class IAgentProvider(ABC):
    """Interface for Agent frameworks (e.g. custom, LangGraph, etc.)"""
    @abstractmethod
    def execute_task(self, agent_name: str, task: str, context: Dict[str, Any]) -> Dict[str, Any]:
        pass

class IMemoryProvider(ABC):
    """Interface for session/working and long-term memory (e.g. Redis, Postgres)"""
    @abstractmethod
    def retrieve(self, key: str) -> Any:
        pass

    @abstractmethod
    def store(self, key: str, value: Any, ttl: int = None):
        pass

class IToolProvider(ABC):
    """Interface for launching security research tools (e.g. Nuclei, Playwright, subfinder)"""
    @abstractmethod
    def run(self, tool_name: str, arguments: List[str], target: str) -> Dict[str, Any]:
        pass
