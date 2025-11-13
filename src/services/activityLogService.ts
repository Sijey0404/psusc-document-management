import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}

/**
 * Logs a user activity to the activity_logs table
 * @param params - Activity log parameters
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { userId, action, entityType, entityId, details } = params;

    // Get user's IP address and user agent if available
    const ipAddress = null; // Could be extracted from request headers in server-side
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Direct insert into activity_logs table
    const { error: insertError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error logging activity:", insertError);
      // Don't throw error to prevent breaking the main flow
    }
  } catch (error) {
    console.error("Error in logActivity:", error);
    // Don't throw error to prevent breaking the main flow
  }
};

/**
 * Helper function to log document-related activities
 */
export const logDocumentActivity = async (
  userId: string,
  action: string,
  documentId: string,
  documentTitle: string,
  additionalInfo?: string
) => {
  const details = additionalInfo 
    ? `${action} document: ${documentTitle}. ${additionalInfo}`
    : `${action} document: ${documentTitle}`;
    
  await logActivity({
    userId,
    action,
    entityType: "document",
    entityId: documentId,
    details,
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
  const details = additionalInfo
    ? `${action} user${targetUserId ? `: ${targetUserId}` : ""}. ${additionalInfo}`
    : `${action} user${targetUserId ? `: ${targetUserId}` : ""}`;
    
  await logActivity({
    userId,
    action,
    entityType: "user",
    entityId: targetUserId,
    details,
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
  const details = additionalInfo
    ? `User ${action.toLowerCase()}. ${additionalInfo}`
    : `User ${action.toLowerCase()}`;
    
  await logActivity({
    userId,
    action,
    entityType: "auth",
    details,
  });
};

/**
 * Helper function to log folder-related activities
 */
export const logFolderActivity = async (
  userId: string,
  action: string,
  folderId: string,
  folderName: string,
  additionalInfo?: string
) => {
  const details = additionalInfo
    ? `${action} folder: ${folderName}. ${additionalInfo}`
    : `${action} folder: ${folderName}`;
    
  await logActivity({
    userId,
    action,
    entityType: "folder",
    entityId: folderId,
    details,
  });
};

