import re


def clean_text(raw_text: str) -> str:
    if not raw_text:
        return ""

    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"[ \t]{2,}", "  ", text)
    text = text.replace("\t", " ")

    lines = [line.strip() for line in text.split("\n")]

    cleaned_lines = []
    blank_run = 0
    for line in lines:
        if line == "":
            blank_run += 1
            if blank_run <= 1:
                cleaned_lines.append(line)
        else:
            blank_run = 0
            cleaned_lines.append(line)

    merged_lines = []
    i = 0
    while i < len(cleaned_lines):
        line = cleaned_lines[i]
        if line.strip() in ("-", "•", "*", "–") and i + 1 < len(cleaned_lines) and cleaned_lines[i + 1].strip():
            merged_lines.append(f"{line.strip()} {cleaned_lines[i + 1].strip()}")
            i += 2
        else:
            merged_lines.append(line)
            i += 1

    return "\n".join(merged_lines).strip()