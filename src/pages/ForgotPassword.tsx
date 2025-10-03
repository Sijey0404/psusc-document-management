import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Loader2, ArrowLeft, Mail, Key } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const { toast } = useAuth();
  const navigate = useNavigate();

  const handleSendOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-password-reset-otp', {
        body: { email }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      setOtpSent(true);
      toast({
        title: "Recovery Request Submitted",
        description: "An administrator will review your request and provide you with the verification code",
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-password-reset-otp', {
        body: { email, otp }
      });
      
      if (error) throw error;
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      if (data.success && data.access_token) {
        // Set the session with the tokens received from the edge function
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        
        if (sessionError) {
          console.error("Error setting session:", sessionError);
          throw sessionError;
        }
        
        toast({
          title: "Verification Successful",
          description: "You will now be prompted to change your password",
        });
        
        // Navigate to root - AuthContext will detect password_change_required and show dialog
        navigate("/");
        return;
      }
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-royal-light/10 via-background to-golden-light/10 p-4">
      <div className="flex items-center mb-8 gap-4">
        <img src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" alt="PSU Logo" className="w-16 h-16" />
        <div>
          <h1 className="text-3xl font-bold text-royal text-left">PSU SAN CARLOS</h1>
          <h2 className="text-xl text-gray-600 text-left">
            Document Management System
          </h2>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="h-1.5 royal-gradient"></div>
          
          <div className="p-8">
            <div className="flex items-center mb-4">
              <Link to="/login" className="mr-3 text-royal hover:text-royal-dark">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h2 className="text-2xl font-bold text-royal">
                Forgot Password
              </h2>
            </div>
            
            <p className="text-gray-600 text-center mb-6">
              {otpSent ? "Enter the verification code provided by the administrator" : "Enter your email to request account recovery from an administrator"}
            </p>

            {!otpSent ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    required 
                    className="bg-blue-50/50 border-royal/20 focus-visible:ring-royal"
                  />
                </div>

                <Button type="submit" disabled={isLoading} className="w-full bg-royal hover:bg-royal-dark h-12">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                     <>
                       <Mail className="mr-2 h-5 w-5" />
                       Request Recovery
                     </>
                   )}
                 </Button>
               </form>
             ) : (
               <form onSubmit={handleVerifyOTP} className="space-y-4">
                 <div className="space-y-2">
                   <Label htmlFor="email">Email</Label>
                   <Input 
                     id="email" 
                     type="email" 
                     value={email} 
                     disabled 
                     className="bg-gray-50 border-gray-200"
                   />
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="otp">Verification Code</Label>
                   <div className="flex justify-center">
                     <InputOTP 
                       value={otp} 
                       onChange={setOtp}
                       maxLength={6}
                     >
                       <InputOTPGroup>
                         <InputOTPSlot index={0} />
                         <InputOTPSlot index={1} />
                         <InputOTPSlot index={2} />
                         <InputOTPSlot index={3} />
                         <InputOTPSlot index={4} />
                         <InputOTPSlot index={5} />
                       </InputOTPGroup>
                     </InputOTP>
                   </div>
                 </div>

                 <div className="space-y-3">
                   <Button type="submit" disabled={isLoading || otp.length !== 6} className="w-full bg-royal hover:bg-royal-dark h-12">
                     {isLoading ? (
                       <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Verifying...
                       </>
                     ) : (
                       <>
                         <Key className="mr-2 h-5 w-5" />
                         Login via OTP
                       </>
                     )}
                   </Button>
                   
                   <Button 
                     type="button" 
                     variant="outline" 
                     onClick={() => setOtpSent(false)}
                     className="w-full"
                   >
                     Send New Request
                   </Button>
                 </div>
               </form>
            )}

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link to="/login" className="text-royal hover:text-royal-dark font-medium hover:underline">
                  Back to Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;