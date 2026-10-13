"""
Structure-aware text cleaner for resume text.

Key principle: normalise noise (encoding artifacts, excess whitespace, broken
bullets) WITHOUT collapsing line structure, which carries section-boundary
information that the section detector depends on.
"""

from __future__ import annotations

import re
import unicodedata


# ---------------------------------------------------------------------------
# Unicode and encoding normalization
# ---------------------------------------------------------------------------

# Common Unicode lookalikes for bullets, dashes, and quotes
_BULLET_MAP = {
    "\u2022": "•",   # BULLET
    "\u2023": "•",   # TRIANGULAR BULLET
    "\u25E6": "•",   # WHITE BULLET
    "\u2043": "-",   # HYPHEN BULLET
    "\u25AA": "•",   # BLACK SMALL SQUARE
    "\u2219": "•",   # BULLET OPERATOR
    "\uF0B7": "•",   # Private-use bullet (PDF encoding artifact)
}

_DASH_MAP = {
    "\u2013": "–",   # EN DASH
    "\u2014": "—",   # EM DASH
    "\u2212": "-",   # MINUS SIGN
    "\uFE58": "-",   # SMALL EM DASH
}

_QUOTE_MAP = {
    "\u2018": "'",
    "\u2019": "'",
    "\u201C": '"',
    "\u201D": '"',
}

_CHAR_MAP = {**_BULLET_MAP, **_DASH_MAP, **_QUOTE_MAP}


def _normalize_unicode(text: str) -> str:
    """Normalize Unicode: apply NFKC, then remap known lookalike characters."""
    text = unicodedata.normalize("NFKC", text)
    return "".join(_CHAR_MAP.get(ch, ch) for ch in text)


# ---------------------------------------------------------------------------
# Line-level cleaning
# ---------------------------------------------------------------------------

# Bullet variants that should be normalised to "•"
_BULLET_RE = re.compile(r"^[\u2022\u2023\u25E6\u2043\u25AA\u2219\uF0B7●○■□▪▸►✓✔\*][\s]*")
# Excessive interior whitespace (not newlines)
_MULTI_SPACE_RE = re.compile(r"[ \t]{2,}")
# Lone-separator lines (e.g. "----" or "====")
_SEPARATOR_RE = re.compile(r"^[-=_|]{3,}$")
# Detect broken wrapping: line ends mid-sentence (no terminal punctuation) AND
# next line starts with a lowercase letter → probably a continuation
_WRAP_RE = re.compile(r"[a-z,]$")
_CONTINUES_RE = re.compile(r"^[a-z]")


def _clean_line(line: str) -> str:
    """Apply per-line normalization without destroying line identity."""
    # Normalise leading bullet to canonical •
    line = _BULLET_RE.sub("• ", line)
    # Collapse internal runs of spaces/tabs (but NOT newlines)
    line = _MULTI_SPACE_RE.sub(" ", line)
    return line.strip()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def clean_text(raw_text: str) -> str:
    """
    Normalise resume text while preserving line-level structure.

    Steps:
    1. Unicode normalisation
    2. Windows/Mac line endings → \\n
    3. Per-line cleaning (bullets, excess spaces)
    4. Drop pure separator lines
    5. Collapse more than one consecutive blank line to exactly one
    6. (Optional) Re-join lines that were broken mid-sentence by PDF wrap

    Returns a clean multi-line string ready for section detection.
    """
    if not raw_text:
        return ""

    text = _normalize_unicode(raw_text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\t", " ")

    lines = text.split("\n")
    cleaned: list[str] = []
    for line in lines:
        line = _clean_line(line)
        if _SEPARATOR_RE.match(line):
            continue  # drop decorative separator lines
        cleaned.append(line)

    # Collapse multiple consecutive blank lines to exactly one
    merged: list[str] = []
    blank_run = 0
    for line in cleaned:
        if line == "":
            blank_run += 1
            if blank_run <= 1:
                merged.append(line)
        else:
            blank_run = 0
            merged.append(line)

    return "\n".join(merged).strip()