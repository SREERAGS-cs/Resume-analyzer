"""
Document Layout and Formatting Inspector for Resume IQ.

Inspects actual PDF and DOCX documents on disk for layout, typography,
alignment, margin, spacing, and machine readability evidence.
Does NOT rely solely on plain text strings.
If a document cannot be accessed or verified, marks inspection as unverified
without fabricating findings.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)


def inspect_document_layout(file_path: str | None) -> dict[str, Any]:
    """
    Inspects layout and formatting of a resume file (PDF or DOCX).
    Returns verified status, formatting score (0-100), ATS parsing score (0-100),
    and structured findings conforming to Phase 3 requirements.
    """
    if not file_path or not os.path.isfile(file_path):
        return {
            "verified": False,
            "inspection_method": "unverified",
            "file_type": None,
            "formatting_score": 70,
            "ats_parsing_score": 75,
            "findings": [],
            "details": {
                "message": "Original document file is not accessible on disk for layout inspection."
            },
        }

    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return _inspect_pdf_layout(file_path)
    elif ext in (".docx", ".doc"):
        return _inspect_docx_layout(file_path)
    else:
        return {
            "verified": False,
            "inspection_method": "unverified",
            "file_type": ext,
            "formatting_score": 70,
            "ats_parsing_score": 75,
            "findings": [],
            "details": {
                "message": f"Unsupported file extension {ext} for deep layout inspection."
            },
        }


def _inspect_pdf_layout(file_path: str) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    inspection_method = "PyMuPDF spatial coordinate inspection"

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
    except Exception as exc:
        logger.warning("Failed to open PDF %s for layout inspection: %s", file_path, exc)
        return {
            "verified": False,
            "inspection_method": "unverified",
            "file_type": ".pdf",
            "formatting_score": 70,
            "ats_parsing_score": 70,
            "findings": [],
            "details": {"error": str(exc)},
        }

    page_count = len(doc)
    all_fonts: set[str] = set()
    all_font_sizes: list[float] = []
    heading_x0_coords: list[float] = []
    line_gaps: list[float] = []
    min_left_margin = float("inf")
    min_right_margin = float("inf")
    min_top_margin = float("inf")
    min_bottom_margin = float("inf")
    has_multicol = False
    has_drawings = False
    has_images = False
    total_chars = 0
    corrupted_char_count = 0

    for page_idx, page in enumerate(doc, start=1):
        rect = page.rect
        page_width = rect.width
        page_height = rect.height

        drawings = page.get_drawings()
        if len(drawings) > 0:
            has_drawings = True

        images = page.get_images()
        if len(images) > 0:
            has_images = True

        try:
            page_dict = page.get_text("dict")
        except Exception:
            page_dict = {}

        blocks = page_dict.get("blocks", [])
        page_body_x0s: list[float] = []

        last_line_y1 = None
        for block in blocks:
            if block.get("type") != 0:  # non-text
                continue

            bbox = block.get("bbox", (0, 0, 0, 0))
            # Track page margins
            min_left_margin = min(min_left_margin, bbox[0])
            min_top_margin = min(min_top_margin, bbox[1])
            min_right_margin = min(min_right_margin, page_width - bbox[2])
            min_bottom_margin = min(min_bottom_margin, page_height - bbox[3])

            for line in block.get("lines", []):
                line_bbox = line.get("bbox", (0, 0, 0, 0))
                if last_line_y1 is not None and line_bbox[1] >= last_line_y1:
                    line_gaps.append(line_bbox[1] - last_line_y1)
                last_line_y1 = line_bbox[3]

                line_text_parts = []
                line_max_size = 0.0
                is_bold = False

                for span in line.get("spans", []):
                    span_text = span.get("text", "").strip()
                    if not span_text:
                        continue
                    line_text_parts.append(span_text)
                    size = round(span.get("size", 10.0), 1)
                    if size > 1.0:  # exclude tiny visual spacers
                        all_font_sizes.append(size)
                    if size > line_max_size:
                        line_max_size = size

                    font_name = span.get("font", "").split("+")[-1]  # strip subset prefix like ABCDEF+
                    if font_name:
                        # Normalize base family name
                        base_family = re.split(r"[-_, ]", font_name)[0]
                        all_fonts.add(base_family)

                    if span.get("flags", 0) & 16:
                        is_bold = True

                    total_chars += len(span_text)
                    corrupted_char_count += span_text.count("\ufffd")

                line_full = " ".join(line_text_parts)
                if line_full:
                    # Multi-column detection
                    if (line_bbox[2] - line_bbox[0]) < page_width * 0.55:
                        page_body_x0s.append(line_bbox[0])

                    # Heading identification: uppercase or title, bold or larger font size
                    if (is_bold or line_max_size >= 11.5) and len(line_full.split()) <= 4 and len(line_full) <= 40:
                        if not re.search(r"[@|•\d]{3,}", line_full):  # not contact details
                            heading_x0_coords.append(round(line_bbox[0], 1))

        # Check for multi-column layout on this page
        left_side = [x for x in page_body_x0s if x < page_width * 0.45]
        right_side = [x for x in page_body_x0s if x >= page_width * 0.45]
        if len(left_side) >= 4 and len(right_side) >= 4:
            has_multicol = True

    doc.close()

    # --- Evaluate Typography & Fonts ---
    font_families = list(all_fonts)
    if len(font_families) > 3:
        findings.append({
            "section": "Typography",
            "element": "Font Families",
            "specific_issue": f"Detected {len(font_families)} distinct font families ({', '.join(sorted(font_families)[:4])}).",
            "severity": "medium",
            "effect": "Inconsistent font families weaken visual hierarchy and can indicate copy-pasted styling.",
            "recommendation": "Standardize on one or at most two complementary font families (e.g. one for headings, one for body).",
            "inspection_method": inspection_method,
        })

    # Font size distribution
    body_sizes = [s for s in all_font_sizes if 8.0 <= s <= 13.0]
    median_body_size = sorted(body_sizes)[len(body_sizes) // 2] if body_sizes else 10.5
    too_small = [s for s in all_font_sizes if 1.0 < s < 8.5]
    if len(too_small) > 5:
        findings.append({
            "section": "Typography",
            "element": "Font Size",
            "specific_issue": f"Text elements with very small font size ({min(too_small)}pt) were detected.",
            "severity": "medium",
            "effect": "Font sizes below 9pt hinder recruiter readability and can trigger OCR ambiguity in some ATS parsers.",
            "recommendation": "Ensure all body copy is sized between 9.5pt and 11.5pt for optimal legibility.",
            "inspection_method": inspection_method,
        })

    # --- Evaluate Heading Alignment ---
    if len(heading_x0_coords) >= 3:
        common_x0 = max(set(heading_x0_coords), key=heading_x0_coords.count)
        deviations = [x for x in heading_x0_coords if abs(x - common_x0) > 15.0]
        if len(deviations) >= 2:
            findings.append({
                "section": "Layout & Structure",
                "element": "Heading Alignment",
                "specific_issue": "Section headings have inconsistent left margins (differing by more than 15pt).",
                "severity": "medium",
                "effect": "Inconsistent heading alignment confuses automated section boundary detectors.",
                "recommendation": "Align all primary section titles (Education, Skills, Experience, Projects) to the exact same left margin.",
                "inspection_method": inspection_method,
            })

    # --- Evaluate Margins ---
    if min_left_margin < 20.0 or min_right_margin < 20.0:
        findings.append({
            "section": "Page Margins",
            "element": "Horizontal Margins",
            "specific_issue": f"Side margins are very narrow (left: {round(min_left_margin, 1)}pt, right: {round(min_right_margin, 1)}pt).",
            "severity": "medium",
            "effect": "Margins under 25pt risk text clipping during rendering, print conversion, or automated scanning.",
            "recommendation": "Set page margins to at least 0.5 inches (36pt) on all sides.",
            "inspection_method": inspection_method,
        })

    if min_top_margin < 15.0:
        findings.append({
            "section": "Header",
            "element": "Top Margin",
            "specific_issue": f"Header content sits extremely close to the top edge ({round(min_top_margin, 1)}pt).",
            "severity": "low",
            "effect": "Header text placed too close to the edge may be misidentified as running headers and stripped by parsers.",
            "recommendation": "Provide at least 30pt of top padding before your name and contact information.",
            "inspection_method": inspection_method,
        })

    # --- Multi-column Advisory ---
    if has_multicol:
        findings.append({
            "section": "Layout & Structure",
            "element": "Columns",
            "specific_issue": "Multi-column layout structure detected across text blocks.",
            "severity": "low",
            "effect": "Complex multi-column layouts can cause legacy ATS parsers to interleave text across columns.",
            "recommendation": "Ensure sections read linearly from top-to-bottom or maintain a single primary flow for critical experience details.",
            "inspection_method": inspection_method,
        })

    # --- Graphics / Images Advisory ---
    if has_images:
        findings.append({
            "section": "Graphics & Media",
            "element": "Embedded Images",
            "specific_issue": "Embedded raster images or icons detected in the document.",
            "severity": "low",
            "effect": "ATS parsers cannot read text embedded inside images or graphic badges.",
            "recommendation": "Keep all skill proficiencies and certifications written as searchable text rather than image badges.",
            "inspection_method": inspection_method,
        })

    # --- Machine Readability & Text Quality ---
    if total_chars < 200:
        findings.append({
            "section": "ATS Parsing",
            "element": "Text Extractability",
            "specific_issue": f"Only {total_chars} extractable characters were detected across {page_count} page(s).",
            "severity": "high",
            "effect": "Document appears to be a scanned image or flattened vector; text cannot be parsed by ATS engines.",
            "recommendation": "Re-export your resume directly from Word, Google Docs, or LaTeX rather than saving a scan or flat image.",
            "inspection_method": inspection_method,
        })

    if corrupted_char_count > 0:
        findings.append({
            "section": "ATS Parsing",
            "element": "Character Encoding",
            "specific_issue": f"Detected {corrupted_char_count} corrupted or unmapped unicode characters (\\ufffd).",
            "severity": "high",
            "effect": "Unmapped font glyphs cause corrupted words and missing keyword recognition in ATS databases.",
            "recommendation": "Avoid non-standard decorative bullet icons or unmapped font symbols; use standard Unicode bullets (•).",
            "inspection_method": inspection_method,
        })

    # Calculate component scores based on findings
    formatting_score = 100
    ats_parsing_score = 100

    for finding in findings:
        sev = finding["severity"]
        if finding["section"] == "ATS Parsing":
            if sev == "high":
                ats_parsing_score -= 40
            elif sev == "medium":
                ats_parsing_score -= 15
            else:
                ats_parsing_score -= 5
        else:
            if sev == "high":
                formatting_score -= 20
            elif sev == "medium":
                formatting_score -= 8
            else:
                formatting_score -= 3

    formatting_score = max(40, min(100, formatting_score))
    ats_parsing_score = max(20, min(100, ats_parsing_score))

    return {
        "verified": True,
        "inspection_method": inspection_method,
        "file_type": ".pdf",
        "page_count": page_count,
        "formatting_score": formatting_score,
        "ats_parsing_score": ats_parsing_score,
        "findings": findings,
        "details": {
            "page_count": page_count,
            "total_chars": total_chars,
            "font_families": sorted(list(all_fonts)),
            "median_body_font_size": median_body_size,
            "has_multicol": has_multicol,
            "has_images": has_images,
            "has_drawings": has_drawings,
            "min_margins_pt": {
                "left": round(min_left_margin, 1) if min_left_margin != float("inf") else 0,
                "right": round(min_right_margin, 1) if min_right_margin != float("inf") else 0,
                "top": round(min_top_margin, 1) if min_top_margin != float("inf") else 0,
                "bottom": round(min_bottom_margin, 1) if min_bottom_margin != float("inf") else 0,
            },
        },
    }


def _inspect_docx_layout(file_path: str) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    inspection_method = "python-docx style and structure inspection"

    try:
        import docx
        doc = docx.Document(file_path)
    except Exception as exc:
        logger.warning("Failed to open DOCX %s for layout inspection: %s", file_path, exc)
        return {
            "verified": False,
            "inspection_method": "unverified",
            "file_type": ".docx",
            "formatting_score": 70,
            "ats_parsing_score": 70,
            "findings": [],
            "details": {"error": str(exc)},
        }

    all_fonts: set[str] = set()
    table_count = len(doc.tables)
    para_count = len(doc.paragraphs)
    total_chars = 0

    # Section margins in pt (1 inch = 72 pt)
    margin_info = {}
    if doc.sections:
        first_sec = doc.sections[0]
        margin_info = {
            "left": round(first_sec.left_margin.pt, 1) if first_sec.left_margin else 72.0,
            "right": round(first_sec.right_margin.pt, 1) if first_sec.right_margin else 72.0,
            "top": round(first_sec.top_margin.pt, 1) if first_sec.top_margin else 72.0,
            "bottom": round(first_sec.bottom_margin.pt, 1) if first_sec.bottom_margin else 72.0,
        }

        if margin_info["left"] < 25.0 or margin_info["right"] < 25.0:
            findings.append({
                "section": "Page Margins",
                "element": "Horizontal Margins",
                "specific_issue": f"Side margins are very narrow ({margin_info['left']}pt).",
                "severity": "medium",
                "effect": "Very narrow margins risk clipping when printed or converted by ATS processors.",
                "recommendation": "Use standard margins of 0.5 to 1.0 inches (36pt to 72pt).",
                "inspection_method": inspection_method,
            })

    for para in doc.paragraphs:
        total_chars += len(para.text)
        for run in para.runs:
            if run.font.name:
                all_fonts.add(run.font.name)

    if len(all_fonts) > 3:
        findings.append({
            "section": "Typography",
            "element": "Font Families",
            "specific_issue": f"Document uses {len(all_fonts)} different font families ({', '.join(sorted(all_fonts)[:4])}).",
            "severity": "medium",
            "effect": "Multiple font families degrade document presentation consistency.",
            "recommendation": "Standardize to a single clean font like Arial, Calibri, or Times New Roman.",
            "inspection_method": inspection_method,
        })

    if table_count > 3:
        findings.append({
            "section": "Layout & Structure",
            "element": "Tables",
            "specific_issue": f"Document contains {table_count} separate tables.",
            "severity": "low",
            "effect": "Complex nested tables can disrupt logical reading order in older ATS engines.",
            "recommendation": "Ensure table structures are simple and have no nested sub-tables.",
            "inspection_method": inspection_method,
        })

    formatting_score = 100
    ats_parsing_score = 100

    for finding in findings:
        sev = finding["severity"]
        if sev == "high":
            formatting_score -= 20
        elif sev == "medium":
            formatting_score -= 8
        else:
            formatting_score -= 3

    formatting_score = max(40, min(100, formatting_score))
    ats_parsing_score = max(40, min(100, ats_parsing_score))

    return {
        "verified": True,
        "inspection_method": inspection_method,
        "file_type": ".docx",
        "page_count": 1,
        "formatting_score": formatting_score,
        "ats_parsing_score": ats_parsing_score,
        "findings": findings,
        "details": {
            "paragraph_count": para_count,
            "table_count": table_count,
            "font_families": sorted(list(all_fonts)),
            "margins_pt": margin_info,
            "total_chars": total_chars,
        },
    }
