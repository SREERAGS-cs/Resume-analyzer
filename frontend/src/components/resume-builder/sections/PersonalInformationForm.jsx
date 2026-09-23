import TextField from "../fields/TextField";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "fullName", label: "Full Name", placeholder: "Jane Doe" },
    { key: "email", label: "Email", placeholder: "jane@example.com", type: "email" },
    { key: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
    { key: "location", label: "Location", placeholder: "City, Country" },
    { key: "linkedin", label: "LinkedIn", placeholder: "linkedin.com/in/janedoe" },
    { key: "github", label: "GitHub", placeholder: "github.com/janedoe" },
    { key: "portfolio", label: "Portfolio", placeholder: "janedoe.dev" },
];

export default function PersonalInformationForm() {
    const { personalInformation, updatePersonalInfo } = useResumeBuilder();

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label, placeholder, type }) => (
                <TextField
                    key={key}
                    label={label}
                    type={type}
                    placeholder={placeholder}
                    value={personalInformation[key]}
                    onChange={(value) => updatePersonalInfo(key, value)}
                />
            ))}
        </div>
    );
}