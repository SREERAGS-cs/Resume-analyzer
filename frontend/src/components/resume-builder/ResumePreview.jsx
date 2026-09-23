import { useResumeBuilder } from "../../context/ResumeBuilderContext";
import ResumeCanvas from "../resume/templates/ResumeCanvas";

export default function ResumePreview() {
    const { effectiveTemplate, personalInformation, summary, skills, education, experience, projects, certifications, achievements, fontFamilyValue, fontSizeScale } = useResumeBuilder();

    const resumeData = { personalInformation, summary, skills, education, experience, projects, certifications, achievements };

    return <ResumeCanvas templateId={effectiveTemplate} resumeData={resumeData} fontFamily={fontFamilyValue} fontSizeScale={fontSizeScale} />;
}