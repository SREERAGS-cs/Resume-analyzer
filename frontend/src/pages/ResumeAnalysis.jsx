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

    const [analysis, setAnalysis] = useState(null);      // mapped view-model or null
    const [hasAnalysis, setHasAnalysis] = useState(null); // null = unknown/loading, false = none yet
    const [sectionsDetected, setSectionsDetected] = useState([]);
    const [notParsed, setNotParsed] = useState(false);

    const [loadingAnalysis, setLoadingAnalysis] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState(false);

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

    useEffect(() => {
        if (!selectedId) return;
        loadForResume(selectedId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    const loadForResume = async (resumeId) => {
        setLoadingAnalysis(true);
        setError(false);
        setNotParsed(false);
        setSectionsDetected([]);

        const resume = resumes.find((r) => String(r.id) === String(resumeId));
        const isParsed = resume?.parsing_status === "needs_review" || resume?.parsing_status === "verified";

        if (isParsed) {
            try {
                const parsed = await getParsedResume(resumeId);
                setSectionsDetected([
                    { name: "Personal Information", detected: !!(parsed.personal_info?.full_name && parsed.personal_info?.email) },
                    { name: "Professional Summary", detected: !!parsed.summary },
                    { name: "Education", detected: (parsed.education || []).length > 0 },
                    { name: "Projects", detected: (parsed.projects || []).length > 0 },
                    { name: "Skills", detected: (parsed.skills || []).length > 0 },
                    { name: "Certifications", detected: (parsed.certifications || []).length > 0 },
                    { name: "Experience", detected: (parsed.experience || []).length > 0 },
                ]);
            } catch {
                // non-fatal — overview list just stays empty
            }
        } else {
            setNotParsed(true);
        }

        try {
            const result = await getLatestAnalysis(resumeId);
            setAnalysis(mapAnalysisResponse(result, resume?.display_name));
            setHasAnalysis(true);
        } catch (err) {
            if (err.response?.status === 404) {
                setHasAnalysis(false);
                setAnalysis(null);
            } else {
                setError(true);
            }
        } finally {
            setLoadingAnalysis(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        setError(false);
        try {
            const result = await analyzeResume(selectedId);
            const resume = resumes.find((r) => String(r.id) === String(selectedId));
            setAnalysis(mapAnalysisResponse(result, resume?.display_name));
            setHasAnalysis(true);
            setNotParsed(false);
        } catch {
            setError(true);
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
                        onChange={setSelectedId}
                        onAnalyze={handleAnalyze}
                        analyzing={analyzing}
                    />

                    {(loadingAnalysis || analyzing) && <AnalysisLoadingState />}

                    {!loadingAnalysis && !analyzing && error && (
                        <AnalysisErrorState onRetry={() => (hasAnalysis === false ? handleAnalyze() : loadForResume(selectedId))} />
                    )}

                    {!loadingAnalysis && !analyzing && !error && notParsed && (
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

                    {!loadingAnalysis && !analyzing && !error && !notParsed && hasAnalysis === false && (
                        <div className="rounded-lg border border-dashed border-line bg-white p-6 text-center">
                            <p className="text-sm font-medium text-ink">No analysis has been performed yet.</p>
                            <p className="mt-1 text-sm text-ink/60">Run an analysis to see your resume's score and recommendations.</p>
                            <button
                                onClick={handleAnalyze}
                                className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper hover:bg-ink/90"
                            >
                                Analyze Resume
                            </button>
                        </div>
                    )}

                    {!loadingAnalysis && !analyzing && !error && analysis && (
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