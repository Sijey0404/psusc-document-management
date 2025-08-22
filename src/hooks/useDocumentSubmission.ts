
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

type FormData = {
  title: string;
  description: string;
  selectedDepartment: string;
  selectedCategory: string;
  selectedFolder: string;
  file: File | null;
};

type FormOptions = {
  departments: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  folderOptions: { id: string; name: string; deadline: string | null }[];
};

export const useDocumentSubmission = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form options (departments, categories, folders)
  const [formOptions, setFormOptions] = useState<FormOptions>({
    departments: [],
    categories: [],
    folderOptions: []
  });
  
  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    selectedDepartment: "",
    selectedCategory: "",
    selectedFolder: "",
    file: null
  });
  
  const [fileError, setFileError] = useState("");

  // Update individual form fields
  const updateFormField = (field: keyof FormData, value: string | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    // If there's no user, redirect to login
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Fetch departments, categories, and folders
    const fetchOptions = async () => {
      try {
        // Fetch departments
        const { data: departmentData, error: deptError } = await supabase
          .from('departments')
          .select('id, name');
        
        if (deptError) throw deptError;
        if (departmentData) {
          // Sort departments to ensure "Information Technology" is first
          const sortedDepartments = [...departmentData].sort((a, b) => {
            if (a.name === "Information Technology") return -1;
            if (b.name === "Information Technology") return 1;
            return a.name.localeCompare(b.name);
          });
          
          setFormOptions(prev => ({ ...prev, departments: sortedDepartments }));
          
          // If user has a department, set it as default
          if (profile?.department_id) {
            updateFormField("selectedDepartment", profile.department_id);
          }
        }
        
        // Fetch categories
        const { data: categoryData, error: catError } = await supabase
          .from('document_categories')
          .select('id, name');
        
        if (catError) throw catError;
        if (categoryData) {
          setFormOptions(prev => ({ ...prev, categories: categoryData }));
        }
        
        // Fetch folders (using document_categories with deadline as folders)
        const { data: folderData, error: folderError } = await supabase
          .from('document_categories')
          .select('id, name, deadline');
        
        if (folderError) throw folderError;
        if (folderData) {
          setFormOptions(prev => ({ ...prev, folderOptions: folderData }));
        }
      } catch (error: any) {
        console.error("Error fetching form options:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load form options",
          variant: "destructive",
        });
      }
    };
    
    fetchOptions();
  }, [user, profile, navigate]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setFileError("");
    
    if (!selectedFile) {
      updateFormField("file", null);
      return;
    }
    
    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFileError("File size exceeds 10MB limit.");
      updateFormField("file", null);
      return;
    }
    
    // Validate file type
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (!validTypes.includes(selectedFile.type)) {
      setFileError("Invalid file type. Please upload a PDF, Word document, Excel spreadsheet, or image.");
      updateFormField("file", null);
      return;
    }
    
    updateFormField("file", selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to submit documents",
        variant: "destructive",
      });
      navigate('/login');
      return;
    }
    
    if (!formData.file) {
      setFileError("Please select a file to upload");
      return;
    }
    
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Document title is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.selectedDepartment) {
      toast({
        title: "Error",
        description: "Department is required",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.selectedCategory) {
      toast({
        title: "Error",
        description: "Category is required",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Generate a unique file path
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${formData.selectedDepartment}/${fileName}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, formData.file);
      
      if (uploadError) throw uploadError;
      
      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          title: formData.title,
          description: formData.description || null,
          submitted_by: user.id,
          department_id: formData.selectedDepartment,
          category_id: formData.selectedCategory,
          folder_id: formData.selectedFolder !== "none" ? formData.selectedFolder : null, // Handle "none" value
          file_path: filePath,
          file_type: formData.file.type,
          file_size: formData.file.size,
          status: "PENDING"
        });
      
      if (insertError) throw insertError;
      
      toast({
        title: "Document submitted",
        description: "Your document has been submitted successfully",
      });
      
      navigate('/documents');
    } catch (error: any) {
      console.error("Error submitting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit document",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFolderDeadlineInfo = (folderId: string) => {
    if (folderId === "none") return null;
    
    const selectedFolder = formOptions.folderOptions.find(folder => folder.id === folderId);
    if (!selectedFolder || !selectedFolder.deadline) return null;
    
    return new Date(selectedFolder.deadline).toLocaleString();
  };

  return {
    formData,
    formOptions,
    updateFormField,
    fileError,
    isSubmitting,
    handleFileChange,
    handleSubmit,
    getFolderDeadlineInfo
  };
};
