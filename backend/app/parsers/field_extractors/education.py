import re

DEGREE_PATTERN = re.compile(
    r"\b(B\.?Tech|M\.?Tech|Bachelor|Master|B\.?Sc|M\.?Sc|B\.?E|M\.?E|Ph\.?D|MBA|BCA|MCA|Diploma|HSC|SSLC|12th|10th)\b[\w.\s()+-]*",
    re.IGNORECASE,
)
DATE_RANGE_PATTERN = re.compile(r"(\d{4})\s*[-–—to]+\s*(\d{4}|present)", re.IGNORECASE)
SCORE_PATTERN = re.compile(r"(CGPA|GPA|Percentage)\s*[:\-]?\s*([\d.]+%?/?\d*)", re.IGNORECASE)


def extract_education(education_raw: str | None) -> list[dict]:
    if not education_raw:
        return []

    lines = [l.strip() for l in education_raw.split("\n") if l.strip()]
    if not lines:
        return []

    # Find line indices where a degree or schooling entry starts
    entry_indices = [i for i, line in enumerate(lines) if DEGREE_PATTERN.search(line)]
    if not entry_indices:
        entry_indices = [0]

    chunks = []
    for idx, start in enumerate(entry_indices):
        end = entry_indices[idx + 1] if idx + 1 < len(entry_indices) else len(lines)
        chunks.append(lines[start:end])

    entries = []
    for chunk_lines in chunks:
        chunk = "\n".join(chunk_lines)
        entry = {
            "degree": None, "institution": None, "field_of_study": None,
            "start_date": None, "end_date": None, "score": None,
        }

        degree_match = DEGREE_PATTERN.search(chunk_lines[0]) or DEGREE_PATTERN.search(chunk)
        if degree_match:
            entry["degree"] = degree_match.group().strip()

        date_match = DATE_RANGE_PATTERN.search(chunk)
        if date_match:
            entry["start_date"] = date_match.group(1)
            entry["end_date"] = date_match.group(2)
        else:
            single_years = re.findall(r"\b(19\d{2}|20\d{2})\b", chunk)
            if len(single_years) >= 2:
                entry["start_date"] = single_years[0]
                entry["end_date"] = single_years[1]
            elif len(single_years) == 1:
                entry["end_date"] = single_years[0]

        score_match = SCORE_PATTERN.search(chunk)
        if score_match:
            entry["score"] = score_match.group(2)

        # Institution line identification
        for line in chunk_lines:
            if entry["degree"] and line.strip() in entry["degree"].strip():
                continue
            if DATE_RANGE_PATTERN.search(line) and len(line.split()) <= 4:
                continue
            if SCORE_PATTERN.search(line) and len(line.split()) <= 4:
                continue
            if re.search(r"\b(19\d{2}|20\d{2})\b", line) and len(line.split()) <= 3:
                continue
            entry["institution"] = line
            break

        entries.append(entry)

    return entries