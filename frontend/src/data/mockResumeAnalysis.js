const mockResumeAnalysis = {
    resumeId: 1,
    resumeName: "Software Engineer Resume",
    lastAnalyzed: "Recently",

    overallScore: 78,

    categoryScores: {
        contentQuality: 82,
        structure: 80,
        skills: 75,
    },

    sectionsDetected: [
        { name: "Personal Information", detected: true },
        { name: "Professional Summary", detected: true },
        { name: "Education", detected: true },
        { name: "Projects", detected: true },
        { name: "Skills", detected: true },
        { name: "Certifications", detected: true },
        { name: "Experience", detected: false },
    ],

    sectionScores: [
        { name: "Professional Summary", score: 8, maxScore: 10, description: "Clear summary with relevant technical focus." },
        { name: "Education", score: 9, maxScore: 10, description: "Education details are complete and well structured." },
        { name: "Experience", score: 6, maxScore: 10, description: "Experience section could contain more relevant details." },
        { name: "Projects", score: 8, maxScore: 10, description: "Projects demonstrate practical technical skills." },
        { name: "Skills", score: 8, maxScore: 10, description: "Good technical coverage with relevant technologies." },
        { name: "Certifications", score: 9, maxScore: 10, description: "Relevant certifications are clearly presented." },
        { name: "Structure", score: 8, maxScore: 10, description: "Resume has a clear and readable structure." },
    ],

    strengths: [
        "Strong technical skills",
        "Relevant academic background",
        "Good project coverage",
        "Certifications are clearly listed",
    ],

    improvements: [
        "Professional summary could be more role-specific",
        "Project descriptions could include measurable outcomes",
        "Experience section is incomplete",
        "Some skills could be aligned more closely with target roles",
    ],

    recommendations: [
        { title: "Strengthen Project Impact", description: "Add measurable outcomes to your project descriptions. For example, mention performance improvements, users, accuracy, or processing time where applicable." },
        { title: "Improve Professional Summary", description: "Tailor the summary toward the type of role you are applying for." },
        { title: "Add Relevant Experience", description: "Consider adding internships, relevant freelance work, research, or substantial technical experience." },
    ],
};

export default mockResumeAnalysis;