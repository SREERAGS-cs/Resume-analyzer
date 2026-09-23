import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResumeCard from "./ResumeCard";
import ResumeCardSkeleton from "./ResumeCardSkeleton";
import RenameResumeModal from "./RenameResumeModal";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import EmptyResumeState from "../dashboard/EmptyResumeState";
import { getResumes, downloadResume, renameResume, deleteResume } from "../../services/resumeService";

export default function ResumeList() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [renameTarget, setRenameTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchResumes = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getResumes();
            setResumes(data);
        } catch {
            setError("Unable to load your resumes. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResumes();
    }, []);

    const handleDownload = async (resume) => {
        try {
            await downloadResume(resume.id, `${resume.display_name}.${resume.file_type}`);
        } catch {
            setError("Download failed. Please try again.");
        }
    };

    const handleRenameConfirm = async (id, newName) => {
        const updated = await renameResume(id, newName);
        setResumes((prev) => prev.map((r) => (r.id === id ? updated : r)));
        setRenameTarget(null);
    };

    const handleDeleteConfirm = async (id) => {
        try {
            await deleteResume(id);
            setResumes((prev) => prev.filter((r) => r.id !== id));
        } catch {
            setError("Delete failed. Please try again.");
        } finally {
            setDeleteTarget(null);
        }
    };

    if (loading) {
        return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <ResumeCardSkeleton key={i} />)}
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {error}
            </div>
        );
    }

    if (resumes.length === 0) {
        return <EmptyResumeState />;
    }

    return (
        <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {resumes.map((resume) => (
                    <ResumeCard
                        key={resume.id}
                        resume={resume}
                        onDownload={handleDownload}
                        onRename={setRenameTarget}
                        onDelete={setDeleteTarget}
                    />
                ))}
            </div>

            {renameTarget && (
                <RenameResumeModal
                    resume={renameTarget}
                    onClose={() => setRenameTarget(null)}
                    onConfirm={handleRenameConfirm}
                />
            )}

            {deleteTarget && (
                <ConfirmDeleteModal
                    resume={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </>
    );
}