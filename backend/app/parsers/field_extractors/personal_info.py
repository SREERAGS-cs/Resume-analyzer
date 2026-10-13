import re

EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PHONE_PATTERN = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}")
LINKEDIN_PATTERN = re.compile(r"(https?://)?(www\.)?linkedin\.com/\S+", re.IGNORECASE)
GITHUB_PATTERN = re.compile(r"(https?://)?(www\.)?github\.com/\S+", re.IGNORECASE)
GENERIC_URL_PATTERN = re.compile(r"(https?://)?(www\.)?[\w-]+\.(dev|com|io|me|net|org)(/\S*)?", re.IGNORECASE)


def extract_personal_info(header_block: str | None, hyperlinks: list[str] | None = None) -> dict:
    result = {
        "full_name": None, "email": None, "phone": None,
        "location": None, "linkedin": None, "github": None, "portfolio": None,
    }
    hyperlinks = hyperlinks or []

    if not header_block:
        header_block = ""

    lines = [l.strip() for l in header_block.split("\n") if l.strip()]

    email_match = EMAIL_PATTERN.search(header_block)
    if email_match:
        result["email"] = email_match.group()

    phone_match = PHONE_PATTERN.search(header_block)
    if phone_match:
        candidate = phone_match.group().strip()
        digit_count = sum(c.isdigit() for c in candidate)
        if 7 <= digit_count <= 15:
            result["phone"] = candidate

    linkedin_match = LINKEDIN_PATTERN.search(header_block)
    if linkedin_match:
        result["linkedin"] = linkedin_match.group()

    github_match = GITHUB_PATTERN.search(header_block)
    if github_match:
        result["github"] = github_match.group()

    # Fallback: text-based match found nothing, but the PDF has an actual
    # clickable link annotation pointing at linkedin.com/github.com — common
    # when a resume shows just an icon + short handle as visible text.
    if not result["linkedin"]:
        for uri in hyperlinks:
            if "linkedin.com" in uri.lower():
                result["linkedin"] = uri
                break

    if not result["github"]:
        for uri in hyperlinks:
            if "github.com" in uri.lower():
                result["github"] = uri
                break

    for url_match in GENERIC_URL_PATTERN.finditer(header_block):
        url = url_match.group()
        if result["email"] and url.lower() in result["email"].lower():
            continue
        if "linkedin" not in url.lower() and "github" not in url.lower() and "@" not in url:
            result["portfolio"] = url
            break

    if not result["portfolio"]:
        for uri in hyperlinks:
            uri_lower = uri.lower()
            if uri_lower.startswith(("http://", "https://")) and "linkedin.com" not in uri_lower and "github.com" not in uri_lower:
                result["portfolio"] = uri
                break

    for line in lines[:3]:
        if EMAIL_PATTERN.search(line) or PHONE_PATTERN.search(line):
            continue
        if any(p.search(line) for p in (LINKEDIN_PATTERN, GITHUB_PATTERN, GENERIC_URL_PATTERN)):
            continue
        words = line.split()
        if 1 <= len(words) <= 5 and all(w[0].isupper() for w in words if w[0].isalpha()):
            result["full_name"] = line
            break

    return result