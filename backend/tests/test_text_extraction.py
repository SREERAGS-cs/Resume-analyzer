import pytest
from docx import Document

from app.parsers.pdf_parser import extract_text_from_pdf
from app.parsers.docx_parser import extract_text_from_docx
from app.parsers.text_cleaner import clean_text


def make_test_pdf(path, pages_text):
    import fitz
    doc = fitz.open()
    for page_text in pages_text:
        page = doc.new_page()
        y = 50
        for line in page_text.split("\n"):
            page.insert_text((50, y), line + " - test paragraph content for extraction")
            y += 20
    doc.save(path)
    doc.close()


def make_test_docx(path, paragraphs):
    doc = Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    doc.save(path)


def test_extract_single_page_pdf(tmp_path):
    pdf_path = tmp_path / "resume.pdf"
    make_test_pdf(str(pdf_path), ["John Doe", "john@example.com"])
    text = extract_text_from_pdf(str(pdf_path))
    assert "John Doe" in text
    assert "john@example.com" in text


def test_extract_multi_page_pdf_preserves_order(tmp_path):
    pdf_path = tmp_path / "resume.pdf"
    make_test_pdf(str(pdf_path), ["Page One", "Page Two", "Page Three"])
    text = extract_text_from_pdf(str(pdf_path))
    assert text.index("Page One") < text.index("Page Two") < text.index("Page Three")


def test_extract_valid_docx(tmp_path):
    docx_path = tmp_path / "resume.docx"
    make_test_docx(str(docx_path), ["Jane Smith", "SKILLS", "Python, SQL"])
    text = extract_text_from_docx(str(docx_path))
    assert "Jane Smith" in text
    assert "SKILLS" in text


def test_extract_empty_docx(tmp_path):
    docx_path = tmp_path / "empty.docx"
    make_test_docx(str(docx_path), [])
    assert extract_text_from_docx(str(docx_path)) == ""


def test_corrupted_pdf_raises(tmp_path):
    bad_pdf = tmp_path / "bad.pdf"
    bad_pdf.write_bytes(b"not a real pdf")
    with pytest.raises(ValueError):
        extract_text_from_pdf(str(bad_pdf))


def test_corrupted_docx_raises(tmp_path):
    bad_docx = tmp_path / "bad.docx"
    bad_docx.write_bytes(b"not a real docx")
    with pytest.raises(ValueError):
        extract_text_from_docx(str(bad_docx))


def test_text_cleaner_collapses_whitespace():
    raw = "John Doe\n\n\nSoftware   Developer\n\n\n\nPython   SQL"
    cleaned = clean_text(raw)
    assert "Software Developer" in cleaned
    assert "\n\n\n" not in cleaned


def test_text_cleaner_preserves_special_tech_names():
    raw = "Skills: C++, C#, Node.js, Next.js, React.js, ASP.NET, CI/CD"
    cleaned = clean_text(raw)
    for token in ["C++", "C#", "Node.js", "Next.js", "React.js", "ASP.NET", "CI/CD"]:
        assert token in cleaned


def test_text_cleaner_preserves_email_and_url():
    raw = "Contact: john@example.com   Portfolio: https://johndoe.dev"
    cleaned = clean_text(raw)
    assert "john@example.com" in cleaned
    assert "https://johndoe.dev" in cleaned