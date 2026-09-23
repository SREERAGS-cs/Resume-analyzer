import { createContext, useContext, useState, useMemo } from "react";
import { DEFAULT_TEMPLATE_ID } from "../config/resumeTemplates";
import { fontFamilyOptions, fontSizeOptions, DEFAULT_FONT_FAMILY_ID, DEFAULT_FONT_SIZE_ID } from "../config/fontOptions";

const ResumeBuilderContext = createContext(null);

const blankPersonalInfo = {
    fullName: "", email: "", phone: "", location: "", linkedin: "", github: "", portfolio: "",
};

const blankEducation = () => ({
    id: crypto.randomUUID(), degree: "", institution: "", fieldOfStudy: "",
    startDate: "", endDate: "", cgpa: "", percentage: "", location: "",
});

const blankExperience = () => ({
    id: crypto.randomUUID(), company: "", jobTitle: "", location: "",
    startDate: "", endDate: "", description: "", responsibilities: [], achievements: [],
});

const blankProject = () => ({
    id: crypto.randomUUID(), projectName: "", description: "", technologies: [], projectLink: "",
});

const blankCertification = () => ({
    id: crypto.randomUUID(), name: "", issuingOrganization: "", date: "", credentialId: "", credentialUrl: "",
});

const blankAchievement = () => ({
    id: crypto.randomUUID(), title: "", description: "", date: "",
});

const blankAdditionalSection = () => ({
    id: crypto.randomUUID(), title: "", content: "",
});

export function ResumeBuilderProvider({ children }) {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [resumeTitle, setResumeTitle] = useState("Untitled Resume");
    const [personalInformation, setPersonalInformation] = useState(blankPersonalInfo);
    const [summary, setSummary] = useState("");
    const [skills, setSkills] = useState([]);
    const [education, setEducation] = useState([]);
    const [experience, setExperience] = useState([]);
    const [projects, setProjects] = useState([]);
    const [certifications, setCertifications] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [additionalSections, setAdditionalSections] = useState([]);
    const [draftId, setDraftId] = useState(null);

    const updatePersonalInfo = (field, value) =>
        setPersonalInformation((prev) => ({ ...prev, [field]: value }));

    const makeListActions = (setList) => ({
        add: (blankFactory) => setList((prev) => [...prev, blankFactory()]),
        update: (id, field, value) =>
            setList((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))),
        remove: (id) => setList((prev) => prev.filter((item) => item.id !== id)),
    });

    const educationActions = makeListActions(setEducation);
    const experienceActions = makeListActions(setExperience);
    const projectActions = makeListActions(setProjects);
    const certificationActions = makeListActions(setCertifications);
    const achievementActions = makeListActions(setAchievements);
    const additionalSectionActions = makeListActions(setAdditionalSections);

    const sectionStatus = useMemo(() => ({
        personalInformation: !!(personalInformation.fullName.trim() && personalInformation.email.trim()),
        summary: summary.trim().length > 0,
        education: education.length > 0,
        experience: experience.length > 0,
        projects: projects.length > 0,
        skills: skills.length > 0,
        certifications: certifications.length > 0,
        achievements: achievements.length > 0,
        additionalSections: additionalSections.length > 0,
    }), [personalInformation, summary, education, experience, projects, skills, certifications, achievements, additionalSections]);

    const completionPercentage = useMemo(() => {
        const values = Object.values(sectionStatus);
        const completed = values.filter(Boolean).length;
        return Math.round((completed / values.length) * 100);
    }, [sectionStatus]);
    const loadFromDraft = (draft) => {
        setDraftId(draft.id);
        setResumeTitle(draft.title || "Untitled Resume");
        setSelectedTemplate(draft.template_id || null);
        if (draft.font_family_id) setFontFamilyId(draft.font_family_id);
        if (draft.font_size_id) setFontSizeId(draft.font_size_id);
        setPersonalInformation(draft.personal_information || blankPersonalInfo);
        setSummary(draft.summary || "");
        setSkills(draft.skills || []);
        setEducation(draft.education || []);
        setExperience(draft.experience || []);
        setProjects(draft.projects || []);
        setCertifications(draft.certifications || []);
        setAchievements(draft.achievements || []);
        setAdditionalSections(draft.additional_sections || []);
    };
    // Falls back to a sensible default only for rendering purposes (e.g. direct
    // /create-resume access) — the actual stored value stays null until the
    // user explicitly picks one via /choose-template.
    const effectiveTemplate = selectedTemplate || DEFAULT_TEMPLATE_ID;

    const [fontFamilyId, setFontFamilyId] = useState(DEFAULT_FONT_FAMILY_ID);
    const [fontSizeId, setFontSizeId] = useState(DEFAULT_FONT_SIZE_ID);
    const fontFamilyValue = fontFamilyOptions.find((f) => f.id === fontFamilyId)?.value;
    const fontSizeScale = fontSizeOptions.find((s) => s.id === fontSizeId)?.scale;

    const value = {
        selectedTemplate, setSelectedTemplate, effectiveTemplate,
        resumeTitle, setResumeTitle,
        personalInformation, updatePersonalInfo,
        summary, setSummary,
        skills, setSkills,
        education, educationActions, blankEducation,
        experience, experienceActions, blankExperience,
        projects, projectActions, blankProject,
        certifications, certificationActions, blankCertification,
        achievements, achievementActions, blankAchievement,
        additionalSections, additionalSectionActions, blankAdditionalSection,
        sectionStatus, completionPercentage, fontFamilyId, setFontFamilyId, fontSizeId, setFontSizeId, fontFamilyValue, fontSizeScale, draftId, setDraftId, loadFromDraft,
    };
    return <ResumeBuilderContext.Provider value={value}>{children}</ResumeBuilderContext.Provider>;
}

export function useResumeBuilder() {
    const context = useContext(ResumeBuilderContext);
    if (!context) throw new Error("useResumeBuilder must be used within a ResumeBuilderProvider");
    return context;
}