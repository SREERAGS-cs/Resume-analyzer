import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
import { validateResumeFile, formatFileSize } from "../../utils/fileValidation";
import { uploadResume } from "../../services/resumeService";

export default function ResumeUpload() {
    const navigate = useNavigate();
    const inputRef = useRef(null);

    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFile = (selectedFile) => {
        const validationError = validateResumeFile(selectedFile);
        if (validationError) {
            setError(validationError);
            setFile(null);
            return;
        }
        setError("");
        setFile(selectedFile);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        handleFile(e.dataTransfer.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError("");
        try {
            await uploadResume(file, setProgress);
            setSuccess(true);
            setTimeout(() => navigate("/dashboard"), 1200);
        } catch (err) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (!err.response) {
                setError("Unable to connect to the server. Please try again.");
            } else {
                setError("Upload failed. Please try again.");
            }
            setUploading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setError("");
        setProgress(0);
        setSuccess(false);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center rounded-lg border border-line bg-white py-16 text-center">
                <CheckCircle2 size={40} className="mb-3 text-success" />
                <h3 className="font-display text-lg font-semibold text-ink">Resume uploaded successfully</h3>
                <p className="mt-1.5 text-sm text-ink/60">Taking you back to the dashboard…</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            {!file ? (
                <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 text-center transition-colors
            ${dragOver ? "border-signal bg-signal/5" : "border-line hover:border-ink/30"}`}
                >
                    <UploadCloud size={36} className="mb-3 text-ink/40" />
                    <p className="text-sm font-medium text-ink">Drag & drop your resume here</p>
                    <p className="mt-1 text-sm text-ink/50">or click to browse — PDF or DOCX, up to 5MB</p>
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".pdf,.docx"
                        className="hidden"
                        onChange={(e) => handleFile(e.target.files[0])}
                    />
                </div>
            ) : (
                <div className="rounded-lg border border-line p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink/5 text-ink">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-ink">{file.name}</p>
                                <p className="text-xs text-ink/50">{formatFileSize(file.size)}</p>
                            </div>
                        </div>
                        {!uploading && (
                            <button onClick={reset} className="text-ink/40 hover:text-ink" aria-label="Remove file">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {uploading && (
                        <div className="mt-4">
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                                <div
                                    className="h-full bg-signal transition-all duration-150"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="mt-1.5 text-xs text-ink/50">{progress}% uploaded</p>
                        </div>
                    )}

                    {!uploading && (
                        <button
                            onClick={handleUpload}
                            className="mt-4 w-full rounded-md bg-ink py-2.5 text-sm font-medium text-paper hover:bg-ink/90 transition-colors"
                        >
                            Upload Resume
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}
        </div>
    );
}