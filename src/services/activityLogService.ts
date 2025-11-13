import { supabase } from "@/integrations/supabase/client";

// Type definitions for activity logs
export type ActivityAction = "LOGIN" | "LOGOUT" | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT" | "VIEW" | "DOWNLOAD" | "PASSWORD_CHANGE" | "PASSWORD_RESET";
export type EntityType = "DOCUMENT" | "USER" | "FOLDER" | "NOTIFICATION" | "CATEGORY" | "DEPARTMENT" | "AUTH";

export interface LogActivityParams {
  userId: string;
  action: ActivityAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  details?: string;
}

/**
 * Gets the user's IP address using a third-party service
 * Falls back to null if unable to fetch
 */
const getUserIPAddress = async (): Promise<string | null> => {
  try {
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), 2000)
    );
    
    const ipPromise = fetch('https://api.ipify.org?format=json')
      .then(async (response) => {
        if (response.ok) {
          const data = await response.json();
          return data.ip || null;
        }
        return null;
      })
      .catch(() => null);
    
    return await Promise.race([ipPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Could not fetch IP address:", error);
    return null;
  }
};

/**
 * Log an activity to the activity_logs table
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { userId, action, entityType, entityId, details } = params;

    // Get current user to verify authentication
    const { data: { session } } = await supabase.auth.getSession();
    let currentUser = session?.user ?? null;

    if (!currentUser) {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser = user ?? null;
    }

    if (!currentUser) {
      console.warn("Cannot log activity: No authenticated user session");
      return;
    }

    if (currentUser.id !== userId) {
      console.warn("Cannot log activity: User ID mismatch", { expected: currentUser.id, received: userId });
      return;
    }

    // Get user's IP address and user agent
    const ipAddressPromise = getUserIPAddress();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Wait for IP address with timeout
    const ipAddress = await Promise.race([
      ipAddressPromise,
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 1000))
    ]);

    // Insert into activity_logs table - Cast to any to bypass TypeScript until types are regenerated
    const { error: insertError } = await (supabase as any)
      .from("activity_logs")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType || null,
        entity_id: entityId || null,
        details: details || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error logging activity:", insertError);
      throw insertError;
    }

    console.log("Activity logged:", action, entityType);
  } catch (error) {
    console.error("Error in logActivity:", error);
    throw error;
  }
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
  const details = additionalInfo 
    ? `${action} document: ${documentTitle}. ${additionalInfo}`
    : `${action} document: ${documentTitle}`;
    
  return logActivity({
    userId,
    action,
    entityType: "DOCUMENT",
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
    
  return logActivity({
    userId,
    action,
    entityType: "USER",
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
    : `User ${action.toLowerCase()}.`;
    
  return logActivity({
    userId,
    action,
    entityType: "AUTH",
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
  folderName?: string,
  additionalInfo?: string
) => {
  const details = additionalInfo
    ? `${action} folder: ${folderName}. ${additionalInfo}`
    : `${action} folder: ${folderName}`;
    
  return logActivity({
    userId,
    action,
    entityType: "FOLDER",
    entityId: folderId,
    details,
  });
};
