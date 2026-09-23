export const resumeTemplates = [
    { id: "modern", name: "Modern", description: "Clean modern layout with a dark sidebar for contact info and skills — suited for tech and product roles.", category: "Professional", atsRating: "Good" },
    { id: "ats-classic", name: "ATS Classic", description: "Maximum-compatibility single-column layout built for applicant tracking systems.", category: "ATS Friendly", atsRating: "Excellent" },
    { id: "professional", name: "Professional", description: "Classic centered-header structure suited for corporate applications.", category: "Professional", atsRating: "Excellent" },
    { id: "minimal", name: "Minimal", description: "Simple, spacious design focused on clarity and readability.", category: "Professional", atsRating: "Excellent" },
    { id: "executive", name: "Executive", description: "Polished layout with a bold header band, suited for senior and leadership roles.", category: "Professional", atsRating: "Good" },
    { id: "two-column", name: "Two Column", description: "Main content and a light sidebar side by side for a balanced, organized look.", category: "Professional", atsRating: "Good" },
    { id: "developer", name: "Developer", description: "Monospace accents and tag-style skills, built with technical roles in mind.", category: "Technical", atsRating: "Good" },
    { id: "academic", name: "Academic", description: "Formal layout that leads with education — suited for research and academic roles.", category: "Academic", atsRating: "Excellent" },
    { id: "compact", name: "Compact", description: "Tight spacing that fits more content on a single page.", category: "Professional", atsRating: "Good" },
    { id: "creative", name: "Creative", description: "Tasteful color accents for design-oriented roles, while staying readable.", category: "Creative", atsRating: "Fair" },
];

export const templateCategories = ["All", "ATS Friendly", "Professional", "Creative", "Academic", "Technical"];

export const getTemplateById = (id) => resumeTemplates.find((t) => t.id === id) || resumeTemplates[2];

export const DEFAULT_TEMPLATE_ID = "professional";