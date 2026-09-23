import re

DATE_PATTERN = re.compile(r"([A-Za-z]{3,9}\.?\s+\d{4}|\d{4})")
LINK_PATTERN = re.compile(r"https?://\S+")


def extract_certifications(certifications_raw: str | None) -> list[dict]:
    if not certifications_raw:
        return []

    entries = []
    for raw_line in certifications_raw.split("\n"):
        raw_line = raw_line.strip()
        if not raw_line:
            continue

        # A line may hold multiple certifications side by side in columns —
        # a genuine double-space run (preserved by the cleaner) marks the boundary.
        segments = [s.strip() for s in re.split(r"\s{2,}", raw_line) if s.strip()]

        for segment in segments:
            entry = {"name": None, "issuer": None, "date": None, "credential_link": None}
            line = segment

            link_match = LINK_PATTERN.search(line)
            if link_match:
                entry["credential_link"] = link_match.group()
                line = line.replace(link_match.group(), "").strip()

            date_match = DATE_PATTERN.search(line)
            if date_match:
                entry["date"] = date_match.group()
                line = line.replace(date_match.group(), "").strip(" ,-–—")

            if re.search(r"[-–—,]", line):
                parts = re.split(r"[-–—,]", line, maxsplit=1)
                entry["name"] = parts[0].strip()
                entry["issuer"] = parts[1].strip() if len(parts) > 1 else None
            else:
                entry["name"] = line.strip()

            if entry["name"]:
                entries.append(entry)

    return entries