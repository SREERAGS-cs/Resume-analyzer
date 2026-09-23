import PersonalInformationForm from "./sections/PersonalInformationForm";
import SummaryForm from "./sections/SummaryForm";
import SkillsForm from "./sections/SkillsForm";
import EducationForm from "./sections/EducationForm";
import ExperienceForm from "./sections/ExperienceForm";
import ProjectsForm from "./sections/ProjectsForm";
import CertificationsForm from "./sections/CertificationsForm";
import AchievementsForm from "./sections/AchievementsForm";
import AdditionalSectionsForm from "./sections/AdditionalSectionsForm";

const SECTION_TITLES = {
    personalInformation: "Personal Information",
    summary: "Professional Summary",
    education: "Education",
    experience: "Experience",
    projects: "Projects",
    skills: "Skills",
    certifications: "Certifications",
    achievements: "Achievements",
    additionalSections: "Additional Sections",
};

const SECTION_FORMS = {
    personalInformation: PersonalInformationForm,
    summary: SummaryForm,
    education: EducationForm,
    experience: ExperienceForm,
    projects: ProjectsForm,
    skills: SkillsForm,
    certifications: CertificationsForm,
    achievements: AchievementsForm,
    additionalSections: AdditionalSectionsForm,
};

export default function ResumeEditor({ activeSection }) {
    const ActiveForm = SECTION_FORMS[activeSection];

    return (
        <div className="rounded-lg border border-line bg-white p-6">
            <h2 className="mb-5 font-display text-lg font-semibold text-ink">
                {SECTION_TITLES[activeSection]}
            </h2>
            <ActiveForm />
        </div>
    );
}