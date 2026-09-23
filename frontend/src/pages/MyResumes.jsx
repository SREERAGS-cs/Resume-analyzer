import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import ResumeList from "../components/resume/ResumeList";
import { Plus } from "lucide-react";

export default function MyResumes() {
    const navigate = useNavigate();

    return (
        <DashboardLayout title="My Resumes">
            <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-ink/60">Manage all your uploaded and created resumes.</p>
                <button
                    onClick={() => navigate("/upload-resume")}
                    className="flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-medium text-paper hover:bg-ink/90 transition-colors"
                >
                    <Plus size={16} /> Upload Resume
                </button>
            </div>
            <ResumeList />
        </DashboardLayout>
    );
}