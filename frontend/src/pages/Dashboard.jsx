import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import DashboardLayout from "../components/layout/DashboardLayout";
import DashboardSkeleton from "../components/dashboard/DashboardSkeleton";
import WelcomeSection from "../components/dashboard/WelcomeSection";
import ResumeStartSection from "../components/dashboard/ResumeStartSection";
import StatCard from "../components/dashboard/StatCard";
import LatestResume from "../components/dashboard/LatestResume";
import ATSPerformance from "../components/dashboard/ATSPerformance";
import RecentActivity from "../components/dashboard/RecentActivity";
import QuickActions from "../components/dashboard/QuickActions";
import { FileText, Target, Briefcase, ScanSearch } from "lucide-react";
import { getDashboardSummary } from "../services/dashboardService";

export default function Dashboard() {
    const { user } = useAuth();
    const firstName = user?.full_name?.split(" ")[0] || "there";

    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        (async () => {
            try {
                const data = await getDashboardSummary();
                setSummary(data);
            } catch {
                setError("Unable to load your dashboard right now.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return (
        <DashboardLayout title="Dashboard">
            <WelcomeSection name={firstName} />
            <ResumeStartSection />

            {loading && <DashboardSkeleton />}

            {!loading && error && (
                <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                    {error}
                </div>
            )}

            {!loading && !error && summary && (
                <>
                    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard icon={FileText} label="Total Resumes" value={summary.total_resumes} />
                        <StatCard
                            icon={Target}
                            label="Latest ATS Score"
                            value={summary.latest_ats_score !== null ? `${summary.latest_ats_score}%` : "—"}
                        />
                        <StatCard icon={Briefcase} label="Job Matches" value={summary.job_matches} />
                        <StatCard icon={ScanSearch} label="Analyses Completed" value={summary.analyses_completed} />
                    </div>

                    <div className="mb-8">
                        <LatestResume resume={summary.latest_resume} />
                    </div>

                    <div className="mb-8 grid gap-6 lg:grid-cols-2">
                        <ATSPerformance data={summary.ats_performance} />
                        <RecentActivity activity={summary.recent_activity} />
                    </div>

                    <QuickActions />
                </>
            )}
        </DashboardLayout>
    );
}