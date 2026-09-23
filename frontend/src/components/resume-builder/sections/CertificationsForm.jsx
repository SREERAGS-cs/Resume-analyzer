import RepeatingEntryForm from "../RepeatingEntryForm";
import { useResumeBuilder } from "../../../context/ResumeBuilderContext";

const FIELDS = [
    { key: "name", label: "Certification Name", placeholder: "AWS Certified Developer" },
    { key: "issuingOrganization", label: "Issuing Organization", placeholder: "Amazon Web Services" },
    { key: "date", label: "Date", placeholder: "Jan 2025" },
    { key: "credentialId", label: "Credential ID", placeholder: "Optional" },
    { key: "credentialUrl", label: "Credential URL", placeholder: "Optional" },
];

export default function CertificationsForm() {
    const { certifications, certificationActions, blankCertification } = useResumeBuilder();

    return (
        <RepeatingEntryForm
            entries={certifications}
            fields={FIELDS}
            onAdd={() => certificationActions.add(blankCertification)}
            onUpdate={certificationActions.update}
            onRemove={certificationActions.remove}
            emptyLabel="No certifications added yet."
            addLabel="Add Certification"
        />
    );
}