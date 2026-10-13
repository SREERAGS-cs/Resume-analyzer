"""
Layout-aware DOCX parser using python-docx.

Handles:
- Normal paragraphs with heading/bold detection
- Tables (common in resumes for two-column layouts and skills grids)
- Hyperlinks embedded in paragraphs
- Normalises output to a plain ordered text string (same contract as pdf_parser)

Backward-compatible public API:
  extract_text_from_docx(file_path) -> str
"""

from __future__ import annotations

import logging
from typing import Optional

logger = logging.getLogger(__name__)


def _paragraph_is_bold(para) -> bool:
    """Return True if ANY run in the paragraph is bold (common heading pattern)."""
    return any(run.bold for run in para.runs if run.bold is not None)


def _paragraph_font_size(para) -> Optional[float]:
    """Return the largest font size (in pt) found among runs, or None."""
    sizes = [run.font.size for run in para.runs if run.font.size is not None]
    if sizes:
        # python-docx sizes are in EMUs (1pt = 12700 EMU)
        return max(sizes) / 12700
    return None


def _extract_paragraph_text(para) -> str:
    """
    Extract clean text from a paragraph, including hyperlink runs which
    python-docx otherwise silently drops.
    """
    parts: list[str] = []
    for child in para._element:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag
        if tag == "r":
            t = child.find(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
            if t is not None and t.text:
                parts.append(t.text)
        elif tag == "hyperlink":
            for r in child.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}r"):
                t = r.find("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
                if t is not None and t.text:
                    parts.append(t.text)
    return "".join(parts).strip()


def _is_heading_style(para) -> bool:
    """True for paragraphs using any Word Heading style."""
    style_name = (para.style.name or "").lower() if para.style else ""
    return "heading" in style_name or style_name.startswith("title")


def _table_to_lines(table) -> list[str]:
    """
    Convert a DOCX table to ordered text lines.

    Many DOCX resumes implement two-column layout via a borderless table
    with two cells per row. We read cell 0 fully, then cell 1, so the
    left column is always read before the right column.
    """
    lines: list[str] = []
    for row in table.rows:
        cells = row.cells
        if not cells:
            continue
        # Deduplicate merged cells (python-docx repeats merged cells)
        seen_ids: set[int] = set()
        unique_cells = []
        for cell in cells:
            cid = id(cell._tc)
            if cid not in seen_ids:
                seen_ids.add(cid)
                unique_cells.append(cell)

        if len(unique_cells) == 1:
            # Single cell – treat as normal paragraph flow
            for para in unique_cells[0].paragraphs:
                text = _extract_paragraph_text(para)
                if text:
                    lines.append(text)
        else:
            # Multi-cell row: read each cell fully before moving to next
            for cell in unique_cells:
                for para in cell.paragraphs:
                    text = _extract_paragraph_text(para)
                    if text:
                        lines.append(text)
    return lines


def extract_text_from_docx(file_path: str) -> str:
    """
    Extract ordered text from a DOCX resume.

    Reading order:
    1. Document body paragraphs (preserving style/bold metadata)
    2. Tables (traversing columns in left-to-right order per row)

    Returns a single newline-separated string compatible with the
    section detector and field extractors.
    """
    try:
        from docx import Document  # noqa: PLC0415
        from docx.opc.exceptions import PackageNotFoundError  # noqa: PLC0415
    except ImportError:
        raise ValueError("python-docx is not installed. Run: pip install python-docx")

    try:
        document = Document(file_path)
    except PackageNotFoundError:
        raise ValueError("This DOCX file appears to be corrupted or is not a valid Word document.")
    except Exception as exc:
        raise ValueError(f"Unable to read DOCX file: {exc}")

    lines: list[str] = []

    # We need to preserve document body order (paragraphs may be interspersed
    # with tables in the raw XML). Walk the body element children directly.
    from docx.oxml.ns import qn  # noqa: PLC0415

    body = document.element.body
    for child in body:
        tag = child.tag.split("}")[-1] if "}" in child.tag else child.tag

        if tag == "p":
            # Paragraph
            from docx.text.paragraph import Paragraph  # noqa: PLC0415
            para = Paragraph(child, document)
            text = _extract_paragraph_text(para)
            if text:
                lines.append(text)

        elif tag == "tbl":
            # Table – use our layout-aware extractor
            from docx.table import Table  # noqa: PLC0415
            table = Table(child, document)
            table_lines = _table_to_lines(table)
            lines.extend(table_lines)

    return "\n".join(lines)