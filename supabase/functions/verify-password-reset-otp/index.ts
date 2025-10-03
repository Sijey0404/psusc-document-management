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
    // Verify OTP from account recovery requests (no approval required)
    const { data: recoveryRequest, error: otpError } = await supabase
      .from('account_recovery_requests')
      .select('*')
      .eq('user_email', email)
      .eq('otp_code', otp)
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

    console.log("OTP verified successfully, updating status to USED...");
    // Update the recovery request status to USED
    const { error: updateError } = await supabase
      .from('account_recovery_requests')
      .update({ 
        status: 'USED',
        handled_at: new Date().toISOString() 
      })
      .eq('id', recoveryRequest.id);
    
    if (updateError) {
      console.error("Error updating recovery request status:", updateError);
      // Don't fail the request, just log the error
    }

    console.log("OTP verified successfully, user can now reset password");
    return new Response(JSON.stringify({ 
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      user_email: email
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
