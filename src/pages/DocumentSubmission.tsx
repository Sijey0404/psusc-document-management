
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DocumentForm } from "@/components/document/DocumentForm";
import { useDocumentSubmission } from "@/hooks/useDocumentSubmission";

const DocumentSubmission = () => {
  const navigate = useNavigate();
  const {
    formData,
    formOptions,
    updateFormField,
    fileError,
    isSubmitting,
    handleFileChange,
    handleSubmit,
    getFolderDeadlineInfo
  } = useDocumentSubmission();

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Submit New Document</h1>
          <button
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
        
        <DocumentForm
          formData={formData}
          formOptions={formOptions}
          fileError={fileError}
          isSubmitting={isSubmitting}
          onFileChange={handleFileChange}
          onFormSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          onUpdateField={(field, value) => updateFormField(field as any, value)}
          getFolderDeadlineInfo={getFolderDeadlineInfo}
        />
      </div>
    </AppLayout>
  );
};

export default DocumentSubmission;
