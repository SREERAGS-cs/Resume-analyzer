import re

DATE_PATTERN = re.compile(r"([A-Za-z]{3,9}\.?\s+\d{4}|\d{4})")
LINK_PATTERN = re.compile(r"https?://\S+")


KNOWN_ISSUERS = {
    "udemy", "coursera", "scaler", "the linux foundation", "linux foundation",
    "nptel", "edx", "udacity", "linkedin", "aws", "google", "microsoft", "oracle",
    "deeplearning.ai", "simplilearn", "hackerrank", "leetcode",
}


def extract_certifications(certifications_raw: str | None) -> list[dict]:
    if not certifications_raw:
        return []

    lines = [l.strip() for l in certifications_raw.split("\n") if l.strip()]
    if not lines:
        return []

    entries = []
    i = 0
    while i < len(lines):
        line = lines[i]
        entry = {"name": None, "issuer": None, "date": None, "credential_link": None}

        link_match = LINK_PATTERN.search(line)
        if link_match:
            entry["credential_link"] = link_match.group()
            line = line.replace(link_match.group(), "").strip()

        date_match = DATE_PATTERN.search(line)
        if date_match:
            entry["date"] = date_match.group()
            line = line.replace(date_match.group(), "").strip(" ,-–—")

        if re.search(r"\s*[-–—]\s*", line):
            parts = re.split(r"\s*[-–—]\s*", line, maxsplit=1)
            entry["name"] = parts[0].strip()
            entry["issuer"] = parts[1].strip()
            i += 1
        elif i + 1 < len(lines):
            next_line = lines[i + 1]
            next_lower = next_line.lower()
            if next_lower in KNOWN_ISSUERS or any(iss in next_lower for iss in KNOWN_ISSUERS) or (len(next_line) <= 35 and not DATE_PATTERN.search(next_line)):
                entry["name"] = line.strip()
                entry["issuer"] = next_line.strip()
                i += 2
            else:
                entry["name"] = line.strip()
                i += 1
        else:
            entry["name"] = line.strip()
            i += 1

        if entry["name"]:
            entries.append(entry)

    return entries