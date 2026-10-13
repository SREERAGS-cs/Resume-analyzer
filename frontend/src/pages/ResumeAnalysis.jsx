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
import { getResumes, getParsedResume } from "../services/resumeService";
import { analyzeResume, getLatestAnalysis } from "../services/resumeAnalysisService";
import { mapAnalysisResponse } from "../utils/mapAnalysisResponse";
// mock data kept for local reference only — never rendered as if it were real: ../data/mockResumeAnalysis

export default function ResumeAnalysis() {
    const navigate = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [loadingResumes, setLoadingResumes] = useState(true);
    const [selectedId, setSelectedId] = useState(null);

    const [analysis, setAnalysis] = useState(null);
    const [sectionsDetected, setSectionsDetected] = useState([]);
    const [notParsed, setNotParsed] = useState(false);

    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await getResumes();
                setResumes(data);
                if (data.length > 0) {
                    setSelectedId(data[0].id);
                }
            } finally {
                setLoadingResumes(false);
            }
        })();
    }, []);

    const handleResumeSelect = (nextResumeId) => {
        setSelectedId(Number(nextResumeId));
        setAnalysis(null);
        setSectionsDetected([]);
        setError(false);
        setErrorMessage(null);
        setNotParsed(false);
    };

    const handleAnalyze = async () => {
        const targetId = selectedId || (resumes.length > 0 ? resumes[0].id : null);
        if (!targetId) {
            setError(true);
            setErrorMessage("Please select a resume before running analysis.");
            return;
        }

        if (!selectedId && targetId) {
            setSelectedId(targetId);
        }

        setAnalyzing(true);
        setError(false);
        setErrorMessage(null);
        setNotParsed(false);
        setAnalysis(null);
        setSectionsDetected([]);

        try {
            const result = await analyzeResume(targetId);
            const resume = resumes.find((r) => String(r.id) === String(targetId));
            setAnalysis(mapAnalysisResponse(result, resume?.display_name));

            try {
                const parsed = await getParsedResume(targetId);
                setSectionsDetected([
                    { name: "Personal Information", detected: !!(parsed?.personal_info?.full_name && parsed?.personal_info?.email) },
                    { name: "Professional Summary", detected: !!parsed?.summary },
                    { name: "Education", detected: (parsed?.education || []).length > 0 },
                    { name: "Projects", detected: (parsed?.projects || []).length > 0 },
                    { name: "Skills", detected: (Array.isArray(parsed?.skills) ? parsed.skills.length > 0 : !!parsed?.skills) },
                    { name: "Certifications", detected: (parsed?.certifications || []).length > 0 },
                    { name: "Experience", detected: (parsed?.experience || []).length > 0 },
                ]);
            } catch {
                // non-fatal
            }
        } catch (err) {
            if (err.response?.status === 400) {
                setNotParsed(true);
            } else {
                setError(true);
                const detail = err.response?.data?.detail;
                setErrorMessage(typeof detail === "string" ? detail : "Something went wrong while analyzing your resume.");
            }
        } finally {
            setAnalyzing(false);
        }
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
                        onChange={handleResumeSelect}
                        onAnalyze={handleAnalyze}
                        analyzing={analyzing}
                    />

                    {analyzing && <AnalysisLoadingState />}

                    {!analyzing && error && (
                        <AnalysisErrorState message={errorMessage} onRetry={handleAnalyze} />
                    )}

                    {!analyzing && !error && notParsed && (
                        <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
                            <p className="text-sm font-medium text-ink">This resume hasn't been parsed yet.</p>
                            <p className="mt-1 text-sm text-ink/60">Review and confirm its content before requesting an analysis.</p>
                            <button
                                onClick={() => navigate(`/resumes/${selectedId}/review`)}
                                className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                            >
                                Go to Resume Review
                            </button>
                        </div>
                    )}

                    {!analyzing && !error && !notParsed && !analysis && (
                        <div className="rounded-lg border border-dashed border-line bg-white p-8 text-center">
                            <p className="font-display text-base font-semibold text-ink">Ready to analyze your resume</p>
                            <p className="mt-1 text-sm text-ink/60">
                                Click “Analyze Resume” above to evaluate your resume's overall score, content quality, and recommendations.
                            </p>
                        </div>
                    )}

                    {!analyzing && !error && !notParsed && analysis && (
                        <div className="flex flex-col gap-6">
                            <OverallScore score={analysis.overallScore} />

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                <ScoreCard label="Content Quality" score={analysis.categoryScores.contentQuality} />
                                <ScoreCard label="Structure" score={analysis.categoryScores.structure} />
                                <ScoreCard label="Skills" score={analysis.categoryScores.skills} />
                            </div>

                            {sectionsDetected.length > 0 && (
                                <ResumeOverview
                                    resumeName={analysis.resumeName}
                                    lastAnalyzed={analysis.lastAnalyzed}
                                    sectionsDetected={sectionsDetected}
                                />
                            )}

                            <AnalysisBreakdown sections={analysis.sectionScores} />

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <StrengthsCard strengths={analysis.strengths} />
                                <ImprovementsCard improvements={analysis.improvements} />
                            </div>

                            <div>
                                <h2 className="mb-3 font-display text-base font-semibold text-ink">AI Recommendations</h2>
                                <div className="flex flex-col gap-3">
                                    {analysis.recommendations.map((r, i) => (
                                        <RecommendationCard key={i} index={i + 1} title={r.title} description={r.description} priority={r.priority} />
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