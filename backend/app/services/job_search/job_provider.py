from abc import ABC, abstractmethod
from typing import Any


class JobProviderError(Exception):
    """An external job provider could not return a valid response."""


class JobProviderNotConfigured(JobProviderError):
    """The application is missing required credentials for the provider."""


class JobProviderRateLimited(JobProviderError):
    """The provider request rate limit or quota was exceeded."""


class JobProviderNetworkError(JobProviderError):
    """Network connection error or timeout reaching provider."""


class JobProvider(ABC):
    source_name: str

    @abstractmethod
    def search(
        self,
        role: str,
        location: str | None,
        opportunity_type: str,
        company: str | None = None,
        country: str = "in",
        page: int = 1,
    ) -> list[dict[str, Any]]:
        """Return provider-native listings for search criteria."""
