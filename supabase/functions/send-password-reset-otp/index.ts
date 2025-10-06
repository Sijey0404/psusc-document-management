import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendOTPRequest = await req.json();
    console.log("Account recovery request for email:", email);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check if user exists in auth.users
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error checking user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: "No user found with this email address" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is archived
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('archived')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking user profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user status" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (userProfile?.archived) {
      return new Response(
        JSON.stringify({ error: "This account has been archived and cannot access password recovery" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiration time (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    
    console.log("Creating account recovery request...");
    
    // Create account recovery request
    const { error: insertError } = await supabase
      .from('account_recovery_requests')
      .insert({
        user_email: email,
        user_id: user.id,
        otp_code: otp,
        expires_at: expiresAt,
        status: 'PENDING'
      });

    if (insertError) {
      console.error("Error creating recovery request:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create recovery request" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Getting admin users to notify...");
    
    // Get all admin users to notify them
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', true);

    if (adminError) {
      console.error("Error fetching admin users:", adminError);
    } else if (adminProfiles && adminProfiles.length > 0) {
      console.log("Creating notifications for admins...");
      
      // Create notification for each admin
      const notifications = adminProfiles.map(admin => ({
        user_id: admin.id,
        message: `Account recovery requested by ${email}. Please review the request in the Account Recovery section.`,
        related_document_id: null
      }));

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notificationError) {
        console.error("Error creating admin notifications:", notificationError);
      }
    }

    console.log("Account recovery request created successfully");

    return new Response(JSON.stringify({ 
      success: true,
      message: "Account recovery request submitted successfully. An administrator will review your request and provide you with the verification code." 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-password-reset-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);