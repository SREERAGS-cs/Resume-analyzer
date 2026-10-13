"""
Layout-aware PDF parser using PyMuPDF (fitz).

Design goals:
- Preserve spatial layout (x/y coordinates, font size, bold flags).
- Correctly reconstruct two-column reading order.
- Support multi-page resumes without incorrectly merging sections.
- Detect scanned/image-based PDFs and return a clear status.
- Return structured block data so downstream extractors can use font signals.

Backward-compatible public API:
  extract_text_from_pdf(file_path) -> str
  extract_pdf_hyperlinks(file_path) -> list[str]
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal block representation
# ---------------------------------------------------------------------------

@dataclass
class TextBlock:
    """One logical text line extracted from a PDF page."""
    text: str
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    font_size: float = 10.0
    is_bold: bool = False
    block_id: int = 0


# ---------------------------------------------------------------------------
# PyMuPDF extraction helpers
# ---------------------------------------------------------------------------

def _flags_to_bold(flags: int) -> bool:
    """PyMuPDF font flags: bit 4 (value 16) = bold."""
    return bool(flags & 16)


def _extract_blocks_from_page(page, page_num: int) -> list[TextBlock]:
    """
    Extract every text span on the page as a TextBlock, preserving
    coordinates, font size, and boldness.
    """
    blocks: list[TextBlock] = []
    try:
        raw = page.get_text("dict")
    except Exception as exc:
        logger.warning("Page %d: get_text dict failed (%s); falling back to plain text", page_num, exc)
        plain = page.get_text("text") or ""
        if plain.strip():
            blocks.append(TextBlock(
                text=plain.strip(), page=page_num,
                x0=0, y0=0, x1=page.rect.width, y1=page.rect.height,
            ))
        return blocks

    block_id = 0
    for block in raw.get("blocks", []):
        if block.get("type") != 0:   # type 0 = text, type 1 = image
            continue
        for line in block.get("lines", []):
            line_parts: list[str] = []
            max_size = 0.0
            any_bold = False
            x0_min = float("inf")
            x1_max = 0.0
            y0_min = float("inf")
            y1_max = 0.0

            for span in line.get("spans", []):
                span_text = span.get("text", "")
                if not span_text and "chars" in span:
                    span_text = "".join(c.get("c", "") for c in span["chars"])
                span_text = span_text.strip()
                if not span_text:
                    continue
                line_parts.append(span_text)
                size = span.get("size", 10.0)
                flags = span.get("flags", 0)
                bbox = span.get("bbox", (0, 0, 0, 0))
                if size > max_size:
                    max_size = size
                if _flags_to_bold(flags):
                    any_bold = True
                x0_min = min(x0_min, bbox[0])
                y0_min = min(y0_min, bbox[1])
                x1_max = max(x1_max, bbox[2])
                y1_max = max(y1_max, bbox[3])

            combined = " ".join(line_parts).strip()
            if not combined:
                continue

            if x0_min == float("inf"):
                bb = block.get("bbox", (0, 0, page.rect.width, page.rect.height))
                x0_min, y0_min, x1_max, y1_max = bb

            blocks.append(TextBlock(
                text=combined,
                page=page_num,
                x0=x0_min,
                y0=y0_min,
                x1=x1_max,
                y1=y1_max,
                font_size=max_size if max_size > 0 else 10.0,
                is_bold=any_bold,
                block_id=block_id,
            ))
            block_id += 1

    return blocks


# ---------------------------------------------------------------------------
# Two-column layout detection and reading-order reconstruction
# ---------------------------------------------------------------------------

def _detect_column_split(blocks: list[TextBlock], page_width: float) -> Optional[float]:
    """
    Heuristic: if many blocks are narrower than ~60 % of the page width AND
    they cluster into two distinct x-origin groups, we have a two-column page.
    Returns the x-coordinate of the column split, or None for single-column.
    """
    if not blocks:
        return None

    # Exclude top header region (top 12% of page height) to prevent centered contact
    # lines from corrupting column split coordinate clustering.
    max_y = max(b.y1 for b in blocks) if blocks else 0.0
    body_blocks = [b for b in blocks if b.y0 > max_y * 0.12]
    target_blocks = body_blocks if len(body_blocks) >= 4 else blocks

    x0_values = [
        b.x0 for b in target_blocks
        if (b.x1 - b.x0) < page_width * 0.60
    ]
    if len(x0_values) < 4:
        return None

    left_cluster = [x for x in x0_values if x < page_width * 0.45]
    right_cluster = [x for x in x0_values if x >= page_width * 0.45]

    if len(left_cluster) < 2 or len(right_cluster) < 2:
        return None

    max_left = max(left_cluster)
    min_right = min(right_cluster)
    gap = min_right - max_left

    if gap > page_width * 0.04:
        return max_left + gap / 2

    return None


def _ordered_text_from_blocks(blocks: list[TextBlock], page_width: float) -> str:
    """
    Reconstruct page text in logical reading order:
      1. Full-width header blocks (name / contact row) – top to bottom.
      2. Left column – top to bottom.
      3. Right column – top to bottom.
    Falls back to simple top-to-bottom for single-column pages.
    """
    if not blocks:
        return ""

    split_x = _detect_column_split(blocks, page_width)

    if split_x is None:
        ordered = sorted(blocks, key=lambda b: (b.y0, b.x0))
        return "\n".join(b.text for b in ordered)

    max_y = max(b.y1 for b in blocks) if blocks else 0.0
    header: list[TextBlock] = []
    left: list[TextBlock] = []
    right: list[TextBlock] = []

    for b in blocks:
        span = b.x1 - b.x0
        if b.y0 <= max_y * 0.12 or span >= page_width * 0.55:
            header.append(b)
        elif b.x1 <= split_x + page_width * 0.05:
            left.append(b)
        elif b.x0 >= split_x - page_width * 0.05:
            right.append(b)
        else:
            # Spans across split – treat as left column content
            left.append(b)

    header.sort(key=lambda b: (b.y0, b.x0))
    left.sort(key=lambda b: (b.y0, b.x0))
    right.sort(key=lambda b: (b.y0, b.x0))

    parts: list[str] = []
    parts.extend(b.text for b in header)
    parts.extend(b.text for b in left)
    parts.extend(b.text for b in right)
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Scanned / image PDF detection
# ---------------------------------------------------------------------------

_MIN_CHARS_PER_PAGE = 10


def _is_scanned_pdf(doc) -> bool:
    """Return True if the document has very little extractable text (likely scanned)."""
    total_chars = sum(len(page.get_text("text").strip()) for page in doc)
    return total_chars < _MIN_CHARS_PER_PAGE * max(len(doc), 1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_blocks_from_pdf(file_path: str) -> list[TextBlock]:
    """
    Extract all TextBlocks from a PDF preserving layout metadata.
    Raises ValueError for scanned PDFs or unreadable files.
    """
    try:
        import fitz  # PyMuPDF  # noqa: PLC0415
    except ImportError:
        raise ValueError("PyMuPDF is not installed. Run: pip install pymupdf")

    try:
        doc = fitz.open(file_path)
    except Exception as exc:
        raise ValueError(f"Unable to open PDF file: {exc}")

    if len(doc) == 0:
        raise ValueError("This PDF has no pages.")

    if _is_scanned_pdf(doc):
        raise ValueError(
            '{"status": "ocr_required", "message": "This document appears to be scanned and requires OCR."}'
        )

    all_blocks: list[TextBlock] = []
    for page_num, page in enumerate(doc, start=1):
        all_blocks.extend(_extract_blocks_from_page(page, page_num))

    doc.close()
    return all_blocks


def extract_text_from_pdf(file_path: str) -> str:
    """
    Backward-compatible public function: returns ordered plain text string.
    Internally uses layout-aware two-column reconstruction via PyMuPDF.
    """
    try:
        import fitz  # PyMuPDF  # noqa: PLC0415
    except ImportError:
        raise ValueError("PyMuPDF is not installed. Run: pip install pymupdf")

    try:
        doc = fitz.open(file_path)
    except Exception as exc:
        raise ValueError(f"Unable to open PDF file: {exc}")

    if len(doc) == 0:
        raise ValueError("This PDF has no pages.")

    if _is_scanned_pdf(doc):
        raise ValueError(
            '{"status": "ocr_required", "message": "This document appears to be scanned and requires OCR."}'
        )

    page_texts: list[str] = []
    for page_num, page in enumerate(doc, start=1):
        try:
            blocks = _extract_blocks_from_page(page, page_num)
            text = _ordered_text_from_blocks(blocks, page.rect.width)
        except Exception as exc:
            logger.warning("Page %d extraction error: %s", page_num, exc)
            text = page.get_text("text") or ""
        if text.strip():
            page_texts.append(text.strip())

    doc.close()
    return "\n\n".join(page_texts)


def extract_pdf_hyperlinks(file_path: str) -> list[str]:
    """Extract all URI hyperlinks from a PDF file."""
    try:
        import fitz  # noqa: PLC0415
        doc = fitz.open(file_path)
        uris: list[str] = []
        for page in doc:
            for link in page.get_links():
                uri = link.get("uri", "")
                if uri:
                    uris.append(uri)
        doc.close()
        return uris
    except Exception:
        return []


def extract_pdf_metadata(file_path: str) -> dict:
    """
    Return page_count, char_count, and structured block data for the first 3 pages.
    Used by downstream parsers and inspection tools.
    """
    try:
        import fitz  # noqa: PLC0415
        doc = fitz.open(file_path)
        page_count = len(doc)
        total_chars = sum(len(page.get_text("text").strip()) for page in doc)
        blocks: list[TextBlock] = []
        for page_num, page in enumerate(doc, start=1):
            if page_num > 3:
                break
            blocks.extend(_extract_blocks_from_page(page, page_num))
        doc.close()
        return {"page_count": page_count, "char_count": total_chars, "blocks": blocks}
    except Exception:
        return {"page_count": 0, "char_count": 0, "blocks": []}