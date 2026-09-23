import re

DEGREE_PATTERN = re.compile(
    r"(B\.?Tech|M\.?Tech|Bachelor|Master|B\.?Sc|M\.?Sc|B\.?E|M\.?E|Ph\.?D|MBA|BCA|MCA|Diploma)[\w.\s]*",
    re.IGNORECASE,
)
DATE_RANGE_PATTERN = re.compile(r"(\d{4})\s*[-–—to]+\s*(\d{4}|present)", re.IGNORECASE)
SCORE_PATTERN = re.compile(r"(CGPA|GPA|Percentage)\s*[:\-]?\s*([\d.]+%?/?\d*)", re.IGNORECASE)


def extract_education(education_raw: str | None) -> list[dict]:
    if not education_raw:
        return []

    # Treat each blank-line-separated chunk as one education entry;
    # if there's no blank-line separation, treat the whole block as one entry
    chunks = [c.strip() for c in re.split(r"\n\s*\n", education_raw) if c.strip()]
    if not chunks:
        chunks = [education_raw.strip()]

    entries = []
    for chunk in chunks:
        lines = [l.strip() for l in chunk.split("\n") if l.strip()]
        entry = {
            "degree": None, "institution": None, "field_of_study": None,
            "start_date": None, "end_date": None, "score": None,
        }

        degree_match = DEGREE_PATTERN.search(chunk)
        if degree_match:
            entry["degree"] = degree_match.group().strip()

        date_match = DATE_RANGE_PATTERN.search(chunk)
        if date_match:
            entry["start_date"] = date_match.group(1)
            entry["end_date"] = date_match.group(2)

        score_match = SCORE_PATTERN.search(chunk)
        if score_match:
            entry["score"] = score_match.group(2)

        # Institution: a line that isn't the degree line and isn't just a date/score line
        for line in lines:
            if entry["degree"] and line.strip() == entry["degree"].strip():
                continue
            if DATE_RANGE_PATTERN.search(line) and len(line.split()) <= 3:
                continue
            if SCORE_PATTERN.search(line) and len(line.split()) <= 4:
                continue
            entry["institution"] = line
            break

        entries.append(entry)

    return entries