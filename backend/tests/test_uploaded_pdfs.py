"""
Integration test: run all uploaded PDFs through the full parsing pipeline.

What it checks per file
------------------------
1. Text extraction succeeds and returns non-empty content
2. Character count (and a snippet of the first 200 chars)
3. Hyperlinks extracted (count + list)
4. Detected sections via section_detector
5. Whether fitz reports the PDF as scanned (low text)
6. No unexpected exceptions

Run from backend/:
    pytest tests/test_uploaded_pdfs.py -v -s
"""

from __future__ import annotations

import os
import sys
import json
import pytest

# Allow imports from backend/ root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.parsers.pdf_parser import (
    extract_text_from_pdf,
    extract_pdf_hyperlinks,
    extract_pdf_metadata,
)
from app.parsers.text_cleaner import clean_text
from app.parsers.section_detector import detect_sections


# ---------------------------------------------------------------------------
# Discover all PDFs under uploads/resumes/
# ---------------------------------------------------------------------------

UPLOADS_ROOT = os.path.join(os.path.dirname(__file__), "..", "uploads", "resumes")


def _collect_pdfs() -> list[tuple[str, str]]:
    """
    Walk uploads/resumes/ and return [(user_folder, abs_path), ...] for every .pdf.
    """
    pdfs: list[tuple[str, str]] = []
    if not os.path.isdir(UPLOADS_ROOT):
        return pdfs
    for user_dir in sorted(os.listdir(UPLOADS_ROOT)):
        full_user = os.path.join(UPLOADS_ROOT, user_dir)
        if not os.path.isdir(full_user):
            continue
        for filename in sorted(os.listdir(full_user)):
            if filename.lower().endswith(".pdf"):
                pdfs.append((user_dir, os.path.join(full_user, filename)))
    return pdfs


ALL_PDFS = _collect_pdfs()
PDF_IDS = [f"user={u} | {os.path.basename(p)}" for u, p in ALL_PDFS]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _try_extract(pdf_path: str) -> tuple[str | None, str | None]:
    """
    Returns (text, error_message).
    error_message is None on success; text is None on failure.
    """
    try:
        return extract_text_from_pdf(pdf_path), None
    except ValueError as exc:
        return None, str(exc)
    except Exception as exc:
        return None, f"Unexpected error: {exc}"


def _is_ocr_required_error(msg: str) -> bool:
    """Return True if the error is the expected scanned-PDF signal."""
    try:
        payload = json.loads(msg)
        return payload.get("status") == "ocr_required"
    except (json.JSONDecodeError, TypeError):
        return False


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

@pytest.mark.skipif(not ALL_PDFS, reason="No PDFs found in uploads/resumes/")
@pytest.mark.parametrize("user_dir,pdf_path", ALL_PDFS, ids=PDF_IDS)
def test_pdf_is_extractable_or_scanned(user_dir, pdf_path, capsys):
    """
    Every uploaded PDF must either:
      a) Yield extractable text (>= 50 chars), OR
      b) Be correctly identified as scanned (ocr_required).

    Any other failure is a bug in the parser or a corrupt file.
    """
    text, err = _try_extract(pdf_path)

    if err:
        # Scanned PDFs are an expected, handled case -- not a test failure.
        assert _is_ocr_required_error(err), (
            f"Unexpected extraction error for {pdf_path!r}:\n{err}"
        )
        print(f"\n[SCANNED] {os.path.basename(pdf_path)} -> OCR required")
        return  # pass

    assert text and len(text.strip()) >= 50, (
        f"Extracted text is too short ({len(text or '')} chars) for {pdf_path!r}"
    )
    print(f"\n[OK] {os.path.basename(pdf_path)} -- {len(text)} chars extracted")


@pytest.mark.skipif(not ALL_PDFS, reason="No PDFs found in uploads/resumes/")
@pytest.mark.parametrize("user_dir,pdf_path", ALL_PDFS, ids=PDF_IDS)
def test_pdf_full_pipeline_report(user_dir, pdf_path, capsys):
    """
    Run the full pipeline (extract -> clean -> section detect -> hyperlinks)
    and print a structured report. Does NOT fail on scanned PDFs.
    """
    filename = os.path.basename(pdf_path)
    sep = "-" * 60

    print(f"\n{sep}")
    print(f"FILE : {filename}")
    print(f"USER : {user_dir}")
    print(f"PATH : {pdf_path}")

    # --- 1. Metadata ---
    meta = extract_pdf_metadata(pdf_path)
    print(f"PAGES: {meta.get('page_count', '?')}")
    print(f"BLOCKS (first 3 pages): {len(meta.get('blocks', []))}")

    # --- 2. Text extraction ---
    text, err = _try_extract(pdf_path)
    if err:
        if _is_ocr_required_error(err):
            print("STATUS: SCANNED PDF -- OCR required, skipping pipeline")
        else:
            print(f"STATUS: EXTRACTION ERROR -- {err}")
        print(sep)
        # Non-scanned errors should be flagged
        if not _is_ocr_required_error(err):
            pytest.fail(f"Extraction failed unexpectedly: {err}")
        return

    print(f"STATUS: EXTRACTABLE")
    print(f"RAW CHARS: {len(text)}")
    print(f"SNIPPET  : {repr(text[:200])}")

    # --- 3. Clean text ---
    cleaned = clean_text(text)
    print(f"CLEAN CHARS: {len(cleaned)}")

    # --- 4. Section detection ---
    block_meta = meta.get("blocks", [])
    sections_result = detect_sections(cleaned, block_metadata=block_meta)
    detected = sections_result.get("sections", {})
    unrecognized = sections_result.get("unrecognized_sections", {})

    print(f"SECTIONS DETECTED ({len(detected)}): {list(detected.keys())}")
    if unrecognized:
        print(f"UNRECOGNIZED HEADINGS: {list(unrecognized.keys())}")
    else:
        print("UNRECOGNIZED HEADINGS: none")

    for name, body in detected.items():
        word_count = len(body.split())
        print(f"  [{name}] -> {word_count} words")

    # --- 5. Hyperlinks ---
    links = extract_pdf_hyperlinks(pdf_path)
    extra = " ..." if len(links) > 5 else ""
    print(f"HYPERLINKS ({len(links)}): {links[:5]}{extra}")

    print(sep)

    # Basic sanity assertions
    assert len(detected) >= 1, (
        f"No recognized sections found in {filename!r}. "
        "Check section_detector aliases or verify the PDF content."
    )
    assert len(cleaned) >= 50, f"Cleaned text suspiciously short: {len(cleaned)} chars"


@pytest.mark.skipif(not ALL_PDFS, reason="No PDFs found in uploads/resumes/")
def test_summary_report(capsys):
    """
    Print a one-line summary table of all PDFs: filename, status, char count, sections.
    Always passes -- purely informational.
    """
    rows = []
    for user_dir, pdf_path in ALL_PDFS:
        filename = os.path.basename(pdf_path)
        text, err = _try_extract(pdf_path)
        if err:
            status = "SCANNED" if _is_ocr_required_error(err) else "ERROR"
            rows.append((filename, status, 0, []))
        else:
            cleaned = clean_text(text)
            sections_result = detect_sections(cleaned)
            sections = list(sections_result.get("sections", {}).keys())
            rows.append((filename, "OK", len(text), sections))

    print("\n")
    print(f"{'FILE':<45} {'STATUS':<10} {'CHARS':>8}  SECTIONS")
    print("-" * 100)
    for filename, status, chars, sections in rows:
        short = filename[:44]
        secs = ", ".join(sections) if sections else "--"
        print(f"{short:<45} {status:<10} {chars:>8}  {secs}")
    print("-" * 100)
    print(f"Total: {len(rows)} PDF(s)")

    # Always pass
    assert True
