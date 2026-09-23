// Mock dashboard data. Replace each of these with a real API call later —
// the shape here is intentionally close to what the FastAPI endpoints will return.

export const mockStats = {
    totalResumes: 3,
    latestATSScore: 82,
    jobMatches: 12,
    analysesCompleted: 7,
};

export const mockLatestResume = {
    name: "Software_Developer_Resume.pdf",
    updatedAt: "2 hours ago",
    atsScore: 82,
    analysisStatus: "Analyzed",
};

export const mockATSPerformance = [
    { month: "Jan", score: 62 },
    { month: "Feb", score: 71 },
    { month: "Mar", score: 78 },
    { month: "Apr", score: 82 },
];

export const mockRecentActivity = [
    { id: 1, label: "Resume uploaded", time: "2 hours ago" },
    { id: 2, label: "Resume analyzed", time: "Yesterday" },
    { id: 3, label: "Job description matched", time: "2 days ago" },
    { id: 4, label: "Resume updated", time: "3 days ago" },
];

// Toggle this to false to preview the new-user empty state
export const hasResumeData = true;