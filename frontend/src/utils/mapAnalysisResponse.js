const SECTION_LABELS = [
    { key: "summary_score", name: "Professional Summary" },
    { key: "education_score", name: "Education" },
    { key: "experience_score", name: "Experience" },
    { key: "projects_score", name: "Projects" },
    { key: "skills_score", name: "Skills" },
    { key: "certifications_score", name: "Certifications" },
    { key: "structure_score", name: "Structure" },
];

export function mapAnalysisResponse(apiResult, resumeName) {
    return {
        resumeName,
        lastAnalyzed: new Date(apiResult.created_at).toLocaleString(undefined, {
            dateStyle: "medium", timeStyle: "short",
        }),
        overallScore: apiResult.overall_score,
        categoryScores: {
            contentQuality: apiResult.content_score,
            structure: apiResult.structure_score,
            skills: apiResult.skills_score,
        },
        sectionScores: SECTION_LABELS.filter((s) => apiResult[s.key] != null).map((s) => ({
            name: s.name, score: apiResult[s.key], maxScore: 100,
        })),
        strengths: apiResult.strengths || [],
        improvements: apiResult.improvements || [],
        recommendations: apiResult.recommendations || [],
    };
}