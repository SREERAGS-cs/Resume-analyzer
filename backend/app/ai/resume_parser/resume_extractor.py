import json
import re

from app.ai.resume_parser.llm_client import call_gemini
from app.ai.resume_parser.prompts import build_extraction_prompt, build_correction_prompt
from app.ai.resume_parser.schemas import ResumeExtractionResult

_CODE_FENCE_PATTERN = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _strip_code_fences(text: str) -> str:
    return _CODE_FENCE_PATTERN.sub("", text).strip()


def _call_and_validate(prompt: str) -> dict:
    raw_response = call_gemini(prompt)
    cleaned = _strip_code_fences(raw_response)
    data = json.loads(cleaned)
    validated = ResumeExtractionResult(**data)
    return validated.model_dump()


def extract_resume_data(raw_text: str, hyperlinks: list[str] | None = None) -> dict:
    """
    Raises on any failure (missing API key, network/quota error, invalid
    JSON, schema validation failure after one retry) — caller is
    responsible for falling back to the rule-based parser.
    """
    prompt = build_extraction_prompt(raw_text, hyperlinks)
    try:
        return _call_and_validate(prompt)
    except Exception as first_error:
        correction_prompt = build_correction_prompt(raw_text, str(first_error), hyperlinks)
        return _call_and_validate(correction_prompt)  # raises again if still invalid — propagates to caller