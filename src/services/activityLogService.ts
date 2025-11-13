/**
 * Activity Log Service
 * 
 * NOTE: This service is currently disabled because the activity_logs table
 * needs to be created in the Supabase database first.
 * 
 * To enable logging:
 * 1. Create the activity_logs table in Supabase using the SQL provided in the Logs page
 * 2. Uncomment the implementation code below
 * 3. Rebuild the project
 */

// Type definitions for activity logs
export type ActivityAction = "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "VIEW" | "DOWNLOAD";
export type EntityType = "DOCUMENT" | "USER" | "FOLDER" | "NOTIFICATION" | "CATEGORY" | "DEPARTMENT" | "AUTH";

export interface LogActivityParams {
  userId: string;
  action: ActivityAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  details?: string;
}

/**
 * Log an activity (CURRENTLY DISABLED - Table needs to be created first)
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  // Temporarily disabled until activity_logs table is created
  console.log("Activity log (disabled):", params);
  return;
};

/**
 * Helper function to log document-related activities
 */
export const logDocumentActivity = async (
  userId: string,
  action: string,
  documentId: string,
  documentTitle?: string,
  additionalInfo?: string
) => {
  return logActivity({
    userId,
    action,
    entityType: "DOCUMENT",
    entityId: documentId,
    details: documentTitle || additionalInfo,
  });
};

/**
 * Helper function to log user-related activities
 */
export const logUserActivity = async (
  userId: string,
  action: string,
  targetUserId?: string,
  additionalInfo?: string
) => {
  return logActivity({
    userId,
    action,
    entityType: "USER",
    entityId: targetUserId,
    details: additionalInfo,
  });
};

/**
 * Helper function to log authentication activities
 */
export const logAuthActivity = async (
  userId: string,
  action: "LOGIN" | "LOGOUT" | "PASSWORD_CHANGE" | "PASSWORD_RESET",
  additionalInfo?: string
) => {
  return logActivity({
    userId,
    action,
    entityType: "AUTH",
    details: additionalInfo,
  });
};

/**
 * Helper function to log folder-related activities
 */
export const logFolderActivity = async (
  userId: string,
  action: string,
  folderId: string,
  folderName?: string,
  additionalInfo?: string
) => {
  return logActivity({
    userId,
    action,
    entityType: "FOLDER",
    entityId: folderId,
    details: folderName || additionalInfo,
  });
};
