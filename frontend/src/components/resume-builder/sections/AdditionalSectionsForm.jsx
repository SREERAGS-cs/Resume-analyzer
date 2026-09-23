import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "title", label: "Section Title", placeholder: "e.g. Languages, Publications, Volunteering" },
    { key: "content", label: "Content", type: "textarea", placeholder: "Details for this section" },
];

export default function AdditionalSectionsForm() {
    const { additionalSections, additionalSectionActions, blankAdditionalSection } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={additionalSections}
            fields={FIELDS}
            onAdd={() => additionalSectionActions.add(blankAdditionalSection)}
            onUpdate={additionalSectionActions.update}
            onRemove={additionalSectionActions.remove}
            emptyLabel="No additional sections added yet."
            addLabel="Add Section"
        />
    );
}