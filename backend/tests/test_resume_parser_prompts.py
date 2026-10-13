import pytest

from app.ai.resume_parser.prompts import build_correction_prompt, build_extraction_prompt
from app.ai.resume_parser import resume_extractor


SOCIAL_PROFILE_RULES = (
    "require clear evidence tying the value to that platform",
    "preserve the complete URL exactly as written",
    "extract that exact text as the value",
    "do not construct or infer a URL or username",
    "Do not fill these fields from unrelated mentions",
    "use null",
)


@pytest.mark.parametrize(
    "resume_text",
    [
        "LinkedIn: https://www.linkedin.com/in/example-profile\n"
        "GitHub: https://github.com/example-user",
        "LinkedIn: Example Candidate\nGitHub: sample-user",
        "Name: Example Candidate\nEmail: candidate@example.com",
        "Built tools with GitHub and followed LinkedIn product news.",
    ],
    ids=["full-urls", "labeled-visible-values", "no-social-profiles", "unrelated-platform-mentions"],
)
def test_extraction_prompt_preserves_social_profile_evidence(resume_text):
    prompt = build_extraction_prompt(resume_text)

    assert resume_text in prompt
    for rule in SOCIAL_PROFILE_RULES:
        assert rule in prompt


def test_correction_prompt_keeps_social_profile_rules():
    prompt = build_correction_prompt(
        "LinkedIn: Example Candidate",
        "invalid JSON",
        ["https://linkedin.com/in/example-profile"],
    )

    for rule in SOCIAL_PROFILE_RULES:
        assert rule in prompt
    assert "https://linkedin.com/in/example-profile" in prompt


def test_extraction_prompt_includes_pdf_hyperlink_evidence():
    prompt = build_extraction_prompt(
        "Example Candidate\nexample-user",
        ["https://www.linkedin.com/in/example-profile", "https://github.com/example-user"],
    )

    assert "PDF hyperlink targets extracted from this resume" in prompt
    assert "only to populate personal_info.linkedin and personal_info.github" in prompt
    assert "https://www.linkedin.com/in/example-profile" in prompt
    assert "https://github.com/example-user" in prompt


def test_extractor_passes_pdf_hyperlinks_to_initial_and_correction_prompts(monkeypatch):
    prompts = []

    def record_prompt(prompt):
        prompts.append(prompt)
        if len(prompts) == 1:
            raise ValueError("invalid response")
        return {}

    monkeypatch.setattr(resume_extractor, "_call_and_validate", record_prompt)
    hyperlinks = ["https://linkedin.com/in/example-profile", "https://github.com/example-user"]

    resume_extractor.extract_resume_data("Example Candidate", hyperlinks)

    assert len(prompts) == 2
    assert all(url in prompt for prompt in prompts for url in hyperlinks)