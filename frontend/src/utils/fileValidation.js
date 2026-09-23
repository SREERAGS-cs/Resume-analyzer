const ALLOWED_EXTENSIONS = ["pdf", "docx"];
const MAX_SIZE_MB = 5;

export const validateResumeFile = (file) => {
    if (!file) return "Please select a file.";

    const extension = file.name.split(".").pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return "Only PDF and DOCX files are supported.";
    }

    if (file.size === 0) {
        return "The selected file is empty.";
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        return `File exceeds the ${MAX_SIZE_MB}MB limit.`;
    }

    return null;
};

export const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};