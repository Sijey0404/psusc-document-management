import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Logs a user activity to the activity_logs table
 * @param params - Activity log parameters
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { userId, action, entityType, entityId, description, metadata } = params;

    // Get user's IP address and user agent if available
    const ipAddress = null; // Could be extracted from request headers in server-side
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Try to call the database function first
    const { error: rpcError } = await supabase.rpc("log_activity", {
      p_user_id: userId,
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId || null,
      p_description: description || null,
      p_metadata: metadata || null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    // If RPC fails, fallback to direct insert
    if (rpcError) {
      console.warn("RPC log_activity failed, trying direct insert:", rpcError);
      
      const { error: insertError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: userId,
          action,
          entity_type: entityType,
          entity_id: entityId || null,
          description: description || null,
          metadata: metadata || null,
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      if (insertError) {
        console.error("Error logging activity (direct insert):", insertError);
        // Don't throw error to prevent breaking the main flow
      }
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
  additionalInfo?: Record<string, any>
) => {
  await logActivity({
    userId,
    action,
    entityType: "document",
    entityId: documentId,
    description: `${action} document: ${documentTitle}`,
    metadata: {
      document_title: documentTitle,
      ...additionalInfo,
    },
  });
};

/**
 * Helper function to log user-related activities
 */
export const logUserActivity = async (
  userId: string,
  action: string,
  targetUserId?: string,
  additionalInfo?: Record<string, any>
) => {
  await logActivity({
    userId,
    action,
    entityType: "user",
    entityId: targetUserId,
    description: `${action} user${targetUserId ? `: ${targetUserId}` : ""}`,
    metadata: additionalInfo,
  });
};

/**
 * Helper function to log authentication activities
 */
export const logAuthActivity = async (
  userId: string,
  action: "LOGIN" | "LOGOUT" | "PASSWORD_CHANGE" | "PASSWORD_RESET",
  additionalInfo?: Record<string, any>
) => {
  await logActivity({
    userId,
    action,
    entityType: "auth",
    description: `User ${action.toLowerCase()}`,
    metadata: additionalInfo,
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
  additionalInfo?: Record<string, any>
) => {
  await logActivity({
    userId,
    action,
    entityType: "folder",
    entityId: folderId,
    description: `${action} folder: ${folderName}`,
    metadata: {
      folder_name: folderName,
      ...additionalInfo,
    },
  });
};

