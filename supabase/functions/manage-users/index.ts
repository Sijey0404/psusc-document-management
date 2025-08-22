
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Only proceed if we have a valid auth token
    const authHeader = req.headers.get("Authorization")?.split(" ")[1];
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's session and check if they're an admin
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getUser(authHeader);
    if (sessionError || !sessionData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if the user is an admin
    const { data: profileData, error: profileError } = await supabaseClient
      .from("profiles")
      .select("role")
      .eq("id", sessionData.user.id)
      .single();

    console.log("Profile check:", { profileData, profileError });

    if (profileError || !profileData || profileData.role !== true) {
      console.log("Admin check failed:", { profileError, profileData, roleValue: profileData?.role });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody = await req.json();
    console.log("Request body received:", JSON.stringify(requestBody));
    
    const { action, userId, userData } = requestBody;
    console.log("Parsed action:", action, "userId:", userId);

    // Handle different user management operations
    switch (action) {
      case "CREATE": {
        const { data, error } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password || "psu3du123",
          email_confirm: true,
          user_metadata: {
            name: userData.name,
            is_admin: userData.role === true,
            position: userData.position,
          },
        });

        if (error) throw error;

        // Upsert full profile data to mirror pending_users and enforce password change
        const profileUpsert = {
          id: data.user.id,
          name: userData.name,
          email: userData.email,
          role: userData.role === true,
          position: userData.position,
          department_id: userData.department_id,
          password_change_required: true,
          updated_at: new Date().toISOString(),
        };

        const { error: profileError } = await supabaseClient
          .from("profiles")
          .upsert(profileUpsert, { onConflict: "id" });
        if (profileError) throw profileError;


        return new Response(
          JSON.stringify({ message: "User created successfully", user: data.user }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "UPDATE": {
        // Update user details in auth.users
        const updateData: any = {};
        if (userData.email) updateData.email = userData.email;
        if (userData.password) updateData.password = userData.password;
        
        if (Object.keys(updateData).length > 0) {
          const { error } = await supabaseClient.auth.admin.updateUserById(
            userId,
            updateData
          );
          if (error) throw error;
        }

        // Update user profile in profiles table
        const profileUpdate: any = {};
        if (userData.name !== undefined) profileUpdate.name = userData.name;
        if (userData.role !== undefined) profileUpdate.role = userData.role;
        if (userData.position !== undefined) profileUpdate.position = userData.position;
        if (userData.department_id !== undefined) profileUpdate.department_id = userData.department_id;

        if (Object.keys(profileUpdate).length > 0) {
          await supabaseClient
            .from("profiles")
            .update(profileUpdate)
            .eq("id", userId);
        }

        return new Response(
          JSON.stringify({ message: "User updated successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "ARCHIVE": {
        // Archive user by updating their profile
        const { error } = await supabaseClient
          .from("profiles")
          .update({ archived: true })
          .eq("id", userId);
        
        if (error) throw error;

        return new Response(
          JSON.stringify({ message: "User archived successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "UNARCHIVE": {
        // Unarchive user by updating their profile
        const { error } = await supabaseClient
          .from("profiles")
          .update({ archived: false })
          .eq("id", userId);
        
        if (error) throw error;

        return new Response(
          JSON.stringify({ message: "User unarchived successfully" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Error in manage-users function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
