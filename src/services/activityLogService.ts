import { supabase } from "@/integrations/supabase/client";

export interface LogActivityParams {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
}

/**
 * Gets the user's IP address using a third-party service
 * Falls back to null if unable to fetch
 * Uses a timeout to prevent blocking
 */
const getUserIPAddress = async (): Promise<string | null> => {
  try {
    // Use Promise.race with timeout to prevent blocking
    const timeoutPromise = new Promise<null>((resolve) => 
      setTimeout(() => resolve(null), 2000) // 2 second timeout
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
 * Logs a user activity to the activity_logs table
 * @param params - Activity log parameters
 */
export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { userId, action, entityType, entityId, details } = params;

    // Get current user to verify authentication
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser || currentUser.id !== userId) {
      console.warn("Cannot log activity: User ID mismatch or not authenticated", {
        currentUserId: currentUser?.id,
        requestedUserId: userId
      });
      return;
    }

    // Get user's IP address and user agent if available
    // Don't await IP address to avoid blocking - fetch it in parallel
    const ipAddressPromise = getUserIPAddress();
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

    // Wait for IP address with a short timeout
    const ipAddress = await Promise.race([
      ipAddressPromise,
      new Promise<string | null>((resolve) => setTimeout(() => resolve(null), 1000))
    ]);

    // Direct insert into activity_logs table
    const { data, error: insertError } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        details: details || null,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error logging activity:", {
        error: insertError,
        action,
        entityType,
        userId,
        details
      });
      // Don't throw error to prevent breaking the main flow
    } else {
      console.log("Activity logged successfully:", {
        id: data?.id,
        action,
        entityType,
        userId
      });
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

