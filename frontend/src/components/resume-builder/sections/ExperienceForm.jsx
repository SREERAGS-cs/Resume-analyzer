import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "jobTitle", label: "Job Title", placeholder: "Software Engineer" },
    { key: "company", label: "Company", placeholder: "Company name" },
    { key: "location", label: "Location", placeholder: "City, Country" },
    { key: "startDate", label: "Start Date", placeholder: "Jan 2023" },
    { key: "endDate", label: "End Date", placeholder: "Present" },
    { key: "description", label: "Description", type: "textarea", placeholder: "Brief overview of the role" },
    { key: "responsibilities", label: "Responsibilities", type: "list", placeholder: "One responsibility per line" },
    { key: "achievements", label: "Achievements", type: "list", placeholder: "One achievement per line" },
];

export default function ExperienceForm() {
    const { experience, experienceActions, blankExperience } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={experience}
            fields={FIELDS}
            onAdd={() => experienceActions.add(blankExperience)}
            onUpdate={experienceActions.update}
            onRemove={experienceActions.remove}
            emptyLabel="No experience added yet."
            addLabel="Add Experience"
        />
    );
}