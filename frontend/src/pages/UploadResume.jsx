import DashboardLayout from "../components/layout/DashboardLayout";
import ResumeUpload from "../components/resume/ResumeUpload";

export default function UploadResume() {
    return (
        <DashboardLayout title="Upload Resume">
            <div className="mx-auto max-w-2xl">
                <h2 className="mb-1 font-display text-xl font-semibold text-ink">Upload your resume</h2>
                <p className="mb-6 text-sm text-ink/60">
                    We accept PDF and DOCX files up to 5MB.
                </p>
                <ResumeUpload />
            </div>
        </DashboardLayout>
    );
}