import ModernTemplate from "./ModernTemplate";
import AtsClassicTemplate from "./AtsClassicTemplate";
import ProfessionalTemplate from "./ProfessionalTemplate";
import MinimalTemplate from "./MinimalTemplate";
import ExecutiveTemplate from "./ExecutiveTemplate";
import TwoColumnTemplate from "./TwoColumnTemplate";
import DeveloperTemplate from "./DeveloperTemplate";
import AcademicTemplate from "./AcademicTemplate";
import CompactTemplate from "./CompactTemplate";
import CreativeTemplate from "./CreativeTemplate";
import { DEFAULT_TEMPLATE_ID } from "../../../config/resumeTemplates";

const TEMPLATE_COMPONENTS = {
    modern: ModernTemplate,
    "ats-classic": AtsClassicTemplate,
    professional: ProfessionalTemplate,
    minimal: MinimalTemplate,
    executive: ExecutiveTemplate,
    "two-column": TwoColumnTemplate,
    developer: DeveloperTemplate,
    academic: AcademicTemplate,
    compact: CompactTemplate,
    creative: CreativeTemplate,
};

export default function TemplateRenderer({ templateId, resumeData }) {
    const Template = TEMPLATE_COMPONENTS[templateId] || TEMPLATE_COMPONENTS[DEFAULT_TEMPLATE_ID];
    return <Template resumeData={resumeData} />;
}