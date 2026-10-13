from app.parsers.section_detector import detect_sections

SAMPLE_RESUME = """John Doe
john@example.com
+91 9876543210

PROFESSIONAL SUMMARY
Software developer with 3 years of experience in full-stack development.

SKILLS
Python, SQL, FastAPI, React, C++, Node.js, CI/CD

EDUCATION
B.Tech in Computer Science
XYZ University
2021 - 2025

EXPERIENCE
Software Engineer, Acme Corp
Jan 2023 - Present
- Built internal tools
- Improved deployment pipeline

PROJECTS
Resume Analyzer
An AI-powered resume analysis tool.

LANGUAGES
English, Hindi
"""


def test_detects_header_block():
    result = detect_sections(SAMPLE_RESUME)
    assert "John Doe" in result["header_block"]
    assert "john@example.com" in result["header_block"]


def test_detects_known_sections():
    result = detect_sections(SAMPLE_RESUME)
    assert "summary" in result["sections"]
    assert "skills" in result["sections"]
    assert "education" in result["sections"]
    assert "experience" in result["sections"]
    assert "projects" in result["sections"]


def test_missing_sections_are_absent_not_fabricated():
    result = detect_sections(SAMPLE_RESUME)
    assert "certifications" not in result["sections"]
    assert "achievements" not in result["sections"]


def test_detects_other_section():
    result = detect_sections(SAMPLE_RESUME)
    assert "languages" in result["sections"]
    assert "English" in result["sections"]["languages"]


def test_preserves_special_tech_names_within_section():
    result = detect_sections(SAMPLE_RESUME)
    skills_block = result["sections"]["skills"]
    for token in ["C++", "Node.js", "CI/CD"]:
        assert token in skills_block


def test_no_headers_returns_everything_as_header_block():
    plain_text = "Just some plain text with no section headers at all."
    result = detect_sections(plain_text)
    assert result["sections"] == {}
    assert result["header_block"] == plain_text


def test_unrecognized_header_is_captured_not_dropped():
    text = "John Doe\n\nLEADERSHIP & EXTRACURRICULARS\nCaptain of the debate team."
    result = detect_sections(text)
    assert "LEADERSHIP & EXTRACURRICULARS" in result["unrecognized_sections"]
    assert "debate team" in result["unrecognized_sections"]["LEADERSHIP & EXTRACURRICULARS"]


def test_alternate_section_naming_maps_to_canonical():
    text = "WORK HISTORY\nSenior Developer at TechCo\n2020-2023"
    result = detect_sections(text)
    assert "experience" in result["sections"]