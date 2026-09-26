import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import AnalysisHeader from "../components/analysis/AnalysisHeader";
import ResumeSelector from "../components/analysis/ResumeSelector";
import OverallScore from "../components/analysis/OverallScore";
import ScoreCard from "../components/analysis/ScoreCard";
import ResumeOverview from "../components/analysis/ResumeOverview";
import AnalysisBreakdown from "../components/analysis/AnalysisBreakdown";
import StrengthsCard from "../components/analysis/StrengthsCard";
import ImprovementsCard from "../components/analysis/ImprovementsCard";
import RecommendationCard from "../components/analysis/RecommendationCard";
import AnalysisEmptyState from "../components/analysis/AnalysisEmptyState";
import AnalysisLoadingState from "../components/analysis/AnalysisLoadingState";
import AnalysisErrorState from "../components/analysis/AnalysisErrorState";
import mockResumeAnalysis from "../data/mockResumeAnalysis";
import { getResumes } from "../services/resumeService";

export default function ResumeAnalysis() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const data = await getResumes();
                setResumes(data);
                if (data.length > 0) {
                    setSelectedId(data[0].id);
                    setAnalysis({ ...mockResumeAnalysis, resumeName: data[0].display_name });
                }
            } catch {
                setResumes([]);
            } finally {
                setLoadingResumes(false);
            }
        })();
    }, []);

    const handleSelectChange = (id) => {
        setSelectedId(id);
        const resume = resumes.find((r) => String(r.id) === String(id));
        setAnalysis({ ...mockResumeAnalysis, resumeName: resume?.display_name || mockResumeAnalysis.resumeName });
        setError(false);
    };

    const handleAnalyze = () => {
        setAnalyzing(true);
        setError(false);
        // Placeholder for the future POST /api/resume-analysis/analyze call.
        setTimeout(() => {
            setAnalysis((prev) => ({ ...(prev || mockResumeAnalysis), lastAnalyzed: "Just now" }));
            setAnalyzing(false);
        }, 1400);
    };

    const handleRetry = () => {
        setError(false);
        handleAnalyze();
    };

    return (
        <DashboardLayout title="Resume Analysis">
            <AnalysisHeader />

            {loadingResumes && <AnalysisLoadingState />}

            {!loadingResumes && resumes.length === 0 && <AnalysisEmptyState />}

            {!loadingResumes && resumes.length > 0 && (
                <>
                    <ResumeSelector
                        resumes={resumes}
                        selectedId={selectedId}
                        onChange={handleSelectChange}
                        onAnalyze={handleAnalyze}
                        analyzing={analyzing}
                    />

                    {analyzing && <AnalysisLoadingState />}
                    {!analyzing && error && <AnalysisErrorState onRetry={handleRetry} />}

                    {!analyzing && !error && analysis && (
                        <div className="flex flex-col gap-6">
                            <OverallScore score={analysis.overallScore} />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <ScoreCard label="Content Quality" score={analysis.categoryScores.contentQuality} />
                                <ScoreCard label="Structure" score={analysis.categoryScores.structure} />
                                <ScoreCard label="Skills" score={analysis.categoryScores.skills} />
                            </div>

                            <ResumeOverview
                                resumeName={analysis.resumeName}
                                lastAnalyzed={analysis.lastAnalyzed}
                                sectionsDetected={analysis.sectionsDetected}
                            />

                            <AnalysisBreakdown sections={analysis.sectionScores} />

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <StrengthsCard strengths={analysis.strengths} />
                                <ImprovementsCard improvements={analysis.improvements} />
                            </div>

                            <div>
                                <h2 className="mb-3 font-display text-base font-semibold text-ink">AI Recommendations</h2>
                                <div className="flex flex-col gap-3">
                                    {analysis.recommendations.map((r, i) => (
                                        <RecommendationCard key={i} index={i + 1} title={r.title} description={r.description} />
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white p-6 text-center sm:flex-row sm:justify-between sm:text-left">
                                <p className="font-display text-base font-semibold text-ink">Ready to improve your resume?</p>
                                <div className="flex gap-2">
                                    <button onClick={() => navigate("/create-resume")} className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5">
                                        Edit Resume
                                    </button>
                                    <button onClick={() => navigate("/ats-score")} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90">
                                        View ATS Analysis
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </DashboardLayout>
    );
}