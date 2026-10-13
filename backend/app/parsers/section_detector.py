"""
Robust, layout-aware section detector for resumes.

Detects 14+ canonical section types using:
  - Keyword matching (80+ aliases)
  - Font size / boldness signals from PDF blocks (when available)
  - Capitalization heuristics
  - Position signals (short isolated line)
  - Confidence scoring

Does NOT assume a fixed section order.
"""

from __future__ import annotations

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Section alias dictionary
# ---------------------------------------------------------------------------
# Each canonical key maps to a list of regex patterns (case-insensitive fullmatch
# or search patterns). Patterns are matched against the stripped, lowercased line.

SECTION_ALIASES: dict[str, list[str]] = {
    "summary": [
        r"^(professional\s+)?summary$",
        r"^career\s+objective$",
        r"^objective$",
        r"^profile$",
        r"^professional\s+profile$",
        r"^career\s+profile$",
        r"^about(\s+me)?$",
        r"^professional\s+overview$",
        r"^overview$",
        r"^personal\s+statement$",
        r"^executive\s+summary$",
        r"^introduction$",
    ],
    "experience": [
        r"^experience$",
        r"^work\s+experience$",
        r"^professional\s+experience$",
        r"^employment(\s+history)?$",
        r"^work\s+history$",
        r"^career\s+history$",
        r"^internship(s)?$",
        r"^industrial\s+training$",
        r"^training(\s+experience)?$",
        r"^job\s+experience$",
    ],
    "education": [
        r"^education(al)?(\s+qualifications?)?$",
        r"^academic(\s+background|\s+qualifications?|\s+details?)?$",
        r"^academics$",
        r"^educational\s+background$",
        r"^qualifications?$",
        r"^schooling$",
    ],
    "skills": [
        r"^(technical\s+)?skills?$",
        r"^core\s+(skills?|competenc(y|ies))$",
        r"^skills?\s*(&|and)?\s*tools?$",
        r"^technical\s+(expertise|proficienc(y|ies)|stack)$",
        r"^technologies(\s+used)?$",
        r"^programming\s+skills?$",
        r"^areas?\s+of\s+expertise$",
        r"^competenc(y|ies)$",
        r"^key\s+skills?$",
        r"^tools?\s*(and\s+technologies?)?$",
        r"^languages?\s+(&|and)\s+technologies?$",
    ],
    "projects": [
        r"^projects?$",
        r"^(academic|personal|key|selected|major|notable|side)\s+projects?$",
        r"^project\s+work$",
        r"^capstone(\s+project)?$",
        r"^mini\s+projects?$",
    ],
    "certifications": [
        r"^certifications?$",
        r"^certificates?$",
        r"^licenses?\s*(&|and)?\s*certifications?$",
        r"^courses?\s*(&|and)?\s*certifications?$",
        r"^professional\s+certifications?$",
        r"^credentials?$",
        r"^online\s+courses?$",
        r"^courses?\s+completed$",
        r"^trainings?\s*(&|and)?\s*certifications?$",
    ],
    "achievements": [
        r"^achievements?$",
        r"^awards?$",
        r"^honors?$",
        r"^accomplishments?$",
        r"^awards?\s*(&|and)?\s*(honors?|achievements?)$",
        r"^recognitions?$",
        r"^accolades?$",
    ],
    "responsibilities": [
        r"^(positions?\s+of\s+)?responsibilities?$",
        r"^leadership(\s+(&|and)\s+responsibilities?)?$",
        r"^roles?\s*(&|and)?\s+responsibilities?$",
        r"^co(-|\s+)?curricular(\s+activities?)?$",
        r"^extra(-|\s+)?curricular(\s+activities?)?$",
    ],
    "publications": [
        r"^publications?$",
        r"^research(\s+papers?|\s+publications?)?$",
        r"^papers?$",
        r"^conference\s+papers?$",
        r"^journal\s+articles?$",
    ],
    "extracurricular": [
        r"^extra(-|\s+)?curricular(\s+activities?)?$",
        r"^activities?$",
        r"^campus\s+activities?$",
        r"^co(-|\s+)?curricular(\s+activities?)?$",
        r"^clubs?\s*(&|and)?\s+activities?$",
    ],
    "volunteering": [
        r"^volunteer(ing)?(\s+experience)?$",
        r"^community\s+service$",
        r"^social\s+work$",
        r"^ngo\s+experience$",
    ],
    "languages": [
        r"^languages?(\s+skills?|\s+known)?$",
        r"^spoken\s+languages?$",
    ],
    "interests": [
        r"^interests?$",
        r"^hobbies(\s*(&|and)\s*interests?)?$",
        r"^personal\s+interests?$",
        r"^other\s+interests?$",
    ],
    "links": [
        r"^links?$",
        r"^online\s+profiles?$",
        r"^social\s+profiles?$",
        r"^web\s+presence$",
        r"^portfolio$",
        r"^websites?$",
    ],
}

# Compile all patterns once at module load
_COMPILED_PATTERNS: dict[str, list[re.Pattern]] = {
    section: [re.compile(p, re.IGNORECASE) for p in patterns]
    for section, patterns in SECTION_ALIASES.items()
}

MAX_HEADER_WORDS = 7
MAX_HEADER_LENGTH = 60


# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------

def _match_canonical(line: str) -> Optional[tuple[str, str, float]]:
    """
    Try to match a line against all known section aliases.
    Returns (canonical_key, original_line, confidence) or None.
    """
    normalized = line.strip().lower().rstrip(":").strip()
    if not normalized:
        return None

    for section, patterns in _COMPILED_PATTERNS.items():
        for pat in patterns:
            if pat.fullmatch(normalized) or pat.search(normalized):
                # Confidence boost for exact uppercase match (common in resumes)
                conf = 0.95 if line.strip().isupper() else 0.88
                return section, line.strip(), conf

    return None


def _looks_like_header_shape(line: str) -> bool:
    """Quick shape-based filter: short, no terminal period, not a bullet."""
    stripped = line.strip()
    if not stripped or len(stripped) > MAX_HEADER_LENGTH:
        return False
    if len(stripped.split()) > MAX_HEADER_WORDS:
        return False
    if stripped.endswith("."):
        return False
    if stripped.startswith(("•", "-", "*", "–", "–")):
        return False
    if "@" in stripped:
        return False
    return True


def _looks_like_unrecognized_header(line: str) -> bool:
    """
    For lines that don't match a known alias but might still be section headers.
    Restricted to ALL-CAPS only — title-case alone is too common in content.
    """
    stripped = line.strip()
    if not _looks_like_header_shape(stripped):
        return False
    # Must be all uppercase alpha words (no digits, no email, no phone)
    if re.search(r"\d", stripped):
        return False
    words = [w for w in stripped.split() if w[:1].isalpha()]
    if not words:
        return False
    return stripped.isupper()


# ---------------------------------------------------------------------------
# Font-signal helpers (when PDF TextBlock metadata is available)
# ---------------------------------------------------------------------------

def _compute_font_confidence(
    line: str,
    font_size: Optional[float],
    is_bold: Optional[bool],
    median_font_size: Optional[float],
) -> float:
    """
    Compute additional confidence bonus from font signals.
    Returns a value in [0, 0.1] to add to keyword confidence.
    """
    bonus = 0.0
    if is_bold:
        bonus += 0.05
    if font_size and median_font_size and font_size > median_font_size * 1.05:
        bonus += 0.05
    return min(bonus, 0.1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect_sections(
    cleaned_text: str,
    block_metadata: Optional[list] = None,
) -> dict:
    """
    Split cleaned resume text into labeled section blocks.

    Args:
        cleaned_text: The cleaned, multi-line resume text.
        block_metadata: Optional list of TextBlock objects from pdf_parser
                        for font-signal based confidence boosting.

    Returns:
        {
            "header_block": str,          # text before first section heading
            "sections": dict[str, str],   # canonical section name → text
            "other_sections": dict,       # (kept for backward compat, now empty)
            "unrecognized_sections": dict,
        }
    """
    lines = cleaned_text.split("\n")

    # Build a font-size lookup keyed by line text for confidence boosting
    font_lookup: dict[str, tuple[Optional[float], Optional[bool]]] = {}
    median_font_size: Optional[float] = None

    if block_metadata:
        sizes = [b.font_size for b in block_metadata if b.font_size and b.font_size > 0]
        if sizes:
            sizes_sorted = sorted(sizes)
            median_font_size = sizes_sorted[len(sizes_sorted) // 2]
        for b in block_metadata:
            font_lookup[b.text.strip()] = (b.font_size, b.is_bold)

    # -----------------------------------------------------------------------
    # Pass 1: find every KNOWN canonical section heading
    # -----------------------------------------------------------------------
    canonical_matches: list[tuple[int, str, str, float]] = []  # (line_idx, key, original, conf)

    for i, line in enumerate(lines):
        if not _looks_like_header_shape(line):
            continue
        result = _match_canonical(line)
        if result:
            key, original, conf = result
            # Font-signal boost
            fs, bold = font_lookup.get(line.strip(), (None, None))
            conf += _compute_font_confidence(line, fs, bold, median_font_size)
            conf = min(conf, 1.0)
            canonical_matches.append((i, key, original, conf))

    first_canonical_index = canonical_matches[0][0] if canonical_matches else None

    # -----------------------------------------------------------------------
    # Pass 2: unrecognized ALL-CAPS headings AFTER the first known section
    # -----------------------------------------------------------------------
    all_matches: list[tuple[int, str, str, float]] = list(canonical_matches)
    known_indices = {m[0] for m in canonical_matches}

    for i, line in enumerate(lines):
        if first_canonical_index is not None and i <= first_canonical_index:
            continue
        if i in known_indices:
            continue
        if not _looks_like_header_shape(line):
            continue
        if _looks_like_unrecognized_header(line):
            fs, bold = font_lookup.get(line.strip(), (None, None))
            # Strict font check: unrecognized section headers must have font size distinctly larger
            # than median body font size (when font metadata is available) to avoid treating sub-items
            # or project names as top-level section cut-offs.
            if font_lookup and median_font_size:
                if fs and fs > median_font_size * 1.08:
                    all_matches.append((i, "_unrecognized_", line.strip(), 0.60))
            else:
                all_matches.append((i, "_unrecognized_", line.strip(), 0.60))

    all_matches.sort(key=lambda m: m[0])

    if not all_matches:
        return {
            "header_block": cleaned_text.strip(),
            "sections": {},
            "other_sections": {},
            "unrecognized_sections": {},
        }

    # Everything before the first heading is the personal-info header block
    header_block = "\n".join(lines[: all_matches[0][0]]).strip()

    sections: dict[str, str] = {}
    unrecognized_sections: dict[str, str] = {}

    for idx, (line_index, key, original, conf) in enumerate(all_matches):
        start = line_index + 1
        end = all_matches[idx + 1][0] if idx + 1 < len(all_matches) else len(lines)
        block = "\n".join(lines[start:end]).strip()

        if not block:
            continue

        if key == "_unrecognized_":
            if original in unrecognized_sections:
                unrecognized_sections[original] += "\n" + block
            else:
                unrecognized_sections[original] = block
        else:
            if key in sections:
                sections[key] += "\n" + block
            else:
                sections[key] = block

    logger.debug(
        "Detected sections: %s | Unrecognized: %s",
        list(sections.keys()),
        list(unrecognized_sections.keys()),
    )

    return {
        "header_block": header_block,
        "sections": sections,
        "other_sections": {},          # kept for backward compat
        "unrecognized_sections": unrecognized_sections,
    }