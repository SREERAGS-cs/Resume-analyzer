import profiles from "../../../shared/role_profiles.json";
import {
    BarChart3,
    BriefcaseBusiness,
    BrainCircuit,
    Cloud,
    Code2,
    Database,
    Layers3,
    Monitor,
    Server,
    ShieldCheck,
    Smartphone,
} from "lucide-react";

const ROLE_ICONS = {
    "software-developer": Code2,
    "full-stack-developer": Layers3,
    "frontend-developer": Monitor,
    "backend-developer": Server,
    "ai-ml-engineer": BrainCircuit,
    "data-scientist": BarChart3,
    "data-analyst": Database,
    "devops-engineer": Cloud,
    "cybersecurity-engineer": ShieldCheck,
    "mobile-developer": Smartphone,
};

export const ROLE_PROFILES = profiles.map((profile) => ({
    ...profile,
    icon: ROLE_ICONS[profile.id] || BriefcaseBusiness,
}));

export const CUSTOM_ROLE_OPTION = {
    id: "custom",
    name: "Other / Custom Role",
    description: "Enter a role title that is not listed above.",
    icon: BriefcaseBusiness,
};
