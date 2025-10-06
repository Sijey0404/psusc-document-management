import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: VerifyOTPRequest = await req.json();
    console.log("OTP verification request for email:", email);

    if (!email || !otp) {
      console.log("Missing email or OTP");
      return new Response(
        JSON.stringify({ error: "Email and OTP are required" }),
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

    console.log("Verifying OTP in account recovery requests...");
    // Verify OTP from account recovery requests
    const { data: recoveryRequest, error: otpError } = await supabase
      .from('account_recovery_requests')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', otp)
      .eq('status', 'PENDING')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (otpError) {
      console.error("Error verifying OTP:", otpError);
      return new Response(
        JSON.stringify({ error: "Failed to verify OTP" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (!recoveryRequest) {
      console.log("No valid recovery request found");
      return new Response(
        JSON.stringify({ error: "Invalid or expired OTP" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("OTP verified, marking request as used...");
    // Mark recovery request as used
    const { error: markUsedError } = await supabase
      .from('account_recovery_requests')
      .update({ 
        status: 'USED',
        handled_at: new Date().toISOString()
      })
      .eq('id', recoveryRequest.id);

    if (markUsedError) {
      console.error("Error marking OTP as used:", markUsedError);
    }

    console.log("Finding user by email...");
    // Get the user by email to create a session
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error("Error fetching user:", userError);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate user" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      console.log("User not found");
      return new Response(
        JSON.stringify({ error: "User not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Check if user is archived
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('archived')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to verify user status" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    if (profileData?.archived === true) {
      console.log("User is archived");
      return new Response(
        JSON.stringify({ error: "This account has been archived and cannot recover password" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Creating session for user...");
    // Create a recovery session for the user
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
    });

    if (linkError) {
      console.error("Error creating recovery link:", linkError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Setting password change required flag...");
    // Set password change required flag
    const { error: flagError } = await supabase
      .from('profiles')
      .update({ password_change_required: true })
      .eq('id', user.id);

    if (flagError) {
      console.error("Error setting password change flag:", flagError);
    }

    console.log("Returning success response with tokens");
    return new Response(JSON.stringify({ 
      success: true,
      access_token: (linkData.properties as any)?.access_token,
      refresh_token: (linkData.properties as any)?.refresh_token,
      user: user,
      message: "OTP verified successfully" 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in verify-password-reset-otp function:", error);
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
