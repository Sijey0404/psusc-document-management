import { supabase } from "@/integrations/supabase/client";

export type ActivityAction =
  | "SIGN_IN"
  | "SIGN_OUT"
  | "SIGN_UP"
  | "PASSWORD_CHANGE"
  | "DOCUMENT_CREATE"
  | "DOCUMENT_UPDATE"
  | "DOCUMENT_DELETE"
  | "DOCUMENT_APPROVE"
  | "DOCUMENT_REJECT"
  | "DOCUMENT_VIEW"
  | "DOCUMENT_DOWNLOAD"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_ARCHIVE"
  | "USER_UNARCHIVE"
  | "FOLDER_CREATE"
  | "FOLDER_UPDATE"
  | "FOLDER_DELETE"
  | "CATEGORY_CREATE"
  | "CATEGORY_UPDATE"
  | "CATEGORY_DELETE"
  | "SETTINGS_UPDATE"
  | "PROFILE_UPDATE";

export type EntityType =
  | "USER"
  | "DOCUMENT"
  | "FOLDER"
  | "CATEGORY"
  | "PROFILE"
  | "AUTH"
  | "SETTINGS"
  | "SYSTEM";

interface LogActivityParams {
  action: ActivityAction;
  entityType: EntityType;
  entityId?: string | null;
  details?: string | null;
}

/**
 * Log an activity to the activity_logs table
 */
export const logActivity = async ({
  action,
  entityType,
  entityId = null,
  details = null,
}: LogActivityParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn("Cannot log activity: No authenticated user");
      return;
    }

    // Get client info
    const userAgent = navigator.userAgent;
    
    const { error } = await supabase.from("activity_logs" as any).insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      user_agent: userAgent,
    });

    if (error) {
      console.error("Error logging activity:", error);
    } else {
      console.log(`Activity logged: ${action} on ${entityType}`, { entityId, details });
    }
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

/**
 * Convenience function to log document-related activities
 */
export const logDocumentActivity = (
  action: Extract<ActivityAction, "DOCUMENT_CREATE" | "DOCUMENT_UPDATE" | "DOCUMENT_DELETE" | "DOCUMENT_APPROVE" | "DOCUMENT_REJECT" | "DOCUMENT_VIEW" | "DOCUMENT_DOWNLOAD">,
  documentId: string,
  details?: string
) => {
  return logActivity({
    action,
    entityType: "DOCUMENT",
    entityId: documentId,
    details,
  });
};

/**
 * Convenience function to log user-related activities
 */
export const logUserActivity = (
  action: Extract<ActivityAction, "USER_CREATE" | "USER_UPDATE" | "USER_ARCHIVE" | "USER_UNARCHIVE">,
  userId: string,
  details?: string
) => {
  return logActivity({
    action,
    entityType: "USER",
    entityId: userId,
    details,
  });
};

/**
 * Convenience function to log authentication activities
 */
export const logAuthActivity = (
  action: Extract<ActivityAction, "SIGN_IN" | "SIGN_OUT" | "SIGN_UP" | "PASSWORD_CHANGE">,
  details?: string
) => {
  return logActivity({
    action,
    entityType: "AUTH",
    details,
  });
};

/**
 * Convenience function to log folder activities
 */
export const logFolderActivity = (
  action: Extract<ActivityAction, "FOLDER_CREATE" | "FOLDER_UPDATE" | "FOLDER_DELETE">,
  folderId: string,
  details?: string
) => {
  return logActivity({
    action,
    entityType: "FOLDER",
    entityId: folderId,
    details,
  });
};
