import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from typing import Any

from app.config.settings import settings
from app.services.job_search.job_provider import JobProvider, JobProviderError, JobProviderNotConfigured


SUPPORTED_COUNTRIES = {
    "in", "us", "gb", "ca", "au", "sg", "de", "fr", "nl", "nz", "za", "pl", "br", "it", "at", "ch"
}


class AdzunaProvider(JobProvider):
    source_name = "Adzuna"
    API_BASE = "https://api.adzuna.com/v1/api/jobs"

    def search(
        self,
        role: str,
        location: str | None,
        opportunity_type: str,
        company: str | None = None,
        country: str = "in",
        page: int = 1,
    ) -> list[dict[str, Any]]:
        if not settings.ADZUNA_APP_ID or not settings.ADZUNA_APP_KEY:
            raise JobProviderNotConfigured("Live job search is not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY.")

        country_code = country.lower().strip() if country else "in"
        if country_code not in SUPPORTED_COUNTRIES:
            country_code = "in"

        page_number = max(1, min(page, 10))

        query_parts = []
        if company and company.strip():
            query_parts.append(company.strip())
        query_parts.append(role.strip())
        if opportunity_type in {"Internship", "Apprenticeship"} and opportunity_type.lower() not in role.lower():
            query_parts.append(opportunity_type)

        what_query = " ".join(query_parts)

        params = {
            "app_id": settings.ADZUNA_APP_ID,
            "app_key": settings.ADZUNA_APP_KEY,
            "results_per_page": 50,
            "what": what_query,
            "content-type": "application/json",
        }
        if location and location.strip():
            params["where"] = location.strip()

        endpoint = f"{self.API_BASE}/{country_code}/search/{page_number}"
        request = Request(
            f"{endpoint}?{urlencode(params)}",
            headers={"Accept": "application/json", "User-Agent": "ResumeIQ/1.0"},
        )
        try:
            with urlopen(request, timeout=12) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code in {401, 403}:
                raise JobProviderNotConfigured("Adzuna authentication failed. Please verify ADZUNA_APP_ID and ADZUNA_APP_KEY.") from exc
            if exc.code == 429:
                from app.services.job_search.job_provider import JobProviderRateLimited
                raise JobProviderRateLimited("Adzuna request limit or quota reached. Please try again shortly.") from exc
            raise JobProviderError(f"Adzuna returned HTTP {exc.code}.") from exc
        except (URLError, TimeoutError) as exc:
            from app.services.job_search.job_provider import JobProviderNetworkError
            raise JobProviderNetworkError("Could not reach Adzuna network. Please check your connection.") from exc
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise JobProviderError("Adzuna returned an invalid listings response.") from exc

        if not isinstance(payload, dict) or not isinstance(payload.get("results"), list):
            raise JobProviderError("Adzuna returned an invalid listings response.")
        return [item for item in payload["results"] if isinstance(item, dict)]
