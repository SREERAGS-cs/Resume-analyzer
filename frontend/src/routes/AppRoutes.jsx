import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import UploadResume from "../pages/UploadResume";
import CreateResume from "../pages/CreateResume";
import ChooseTemplate from "../pages/ChooseTemplate";
import MyResumes from "../pages/MyResumes";
import ResumeHistory from "../pages/ResumeHistory";
import ResumeReview from "../pages/ResumeReview";
import PlaceholderPage from "../pages/PlaceholderPage";
import ProtectedRoute from "../components/common/ProtectedRoute";
import PublicOnlyRoute from "../components/common/PublicOnlyRoute";
import ResumeCreationFlow from "../components/resume-builder/ResumeCreationFlow";
import MyDrafts from "../pages/MyDrafts";
import ResumeAnalysis from "../pages/ResumeAnalysis";

const placeholderRoutes = [
    { path: "/ats-score", title: "ATS Score" },
    { path: "/job-matching", title: "Job Matching" },
    { path: "/recommendations", title: "AI Recommendations" },
    { path: "/profile", title: "Profile" },
    { path: "/settings", title: "Settings" },
];

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/upload-resume" element={<ProtectedRoute><UploadResume /></ProtectedRoute>} />
            <Route path="/resumes" element={<ProtectedRoute><MyResumes /></ProtectedRoute>} />
            <Route path="/my-drafts" element={<ProtectedRoute><MyDrafts /></ProtectedRoute>} />
            <Route path="/resume-history" element={<ProtectedRoute><ResumeHistory /></ProtectedRoute>} />
            <Route path="/resumes/:resumeId/review" element={<ProtectedRoute><ResumeReview /></ProtectedRoute>} />
            <Route path="/resume-analysis" element={<ProtectedRoute><ResumeAnalysis /></ProtectedRoute>} />

            {/* Shared provider so template selection <-> builder navigation never loses data */}
            <Route path="/" element={<ProtectedRoute><ResumeCreationFlow /></ProtectedRoute>}>
                <Route path="/choose-template" element={<ChooseTemplate />} />
                <Route path="/create-resume" element={<CreateResume />} />
            </Route>

            {placeholderRoutes.map(({ path, title }) => (
                <Route key={path} path={path} element={<ProtectedRoute><PlaceholderPage title={title} /></ProtectedRoute>} />
            ))}

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}