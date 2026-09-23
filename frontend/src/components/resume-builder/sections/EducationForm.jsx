import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "degree", label: "Degree", placeholder: "B.Tech in Computer Science" },
    { key: "institution", label: "Institution", placeholder: "University name" },
    { key: "fieldOfStudy", label: "Field of Study", placeholder: "Computer Science" },
    { key: "startDate", label: "Start Date", placeholder: "2021" },
    { key: "endDate", label: "End Date", placeholder: "2025" },
    { key: "cgpa", label: "CGPA", placeholder: "8.5" },
    { key: "percentage", label: "Percentage", placeholder: "85%" },
    { key: "location", label: "Location", placeholder: "City, Country" },
];

export default function EducationForm() {
    const { education, educationActions, blankEducation } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={education}
            fields={FIELDS}
            onAdd={() => educationActions.add(blankEducation)}
            onUpdate={educationActions.update}
            onRemove={educationActions.remove}
            emptyLabel="No education added yet."
            addLabel="Add Education"
        />
    );
}