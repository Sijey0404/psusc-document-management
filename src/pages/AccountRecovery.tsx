import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, User, Mail, Clock, Key, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface AccountRecoveryRequest {
  id: string;
  user_email: string;
  user_id: string;
  otp_code: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED';
  requested_at: string;
  handled_by?: string;
  handled_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    name: string;
    position: string;
    department_id?: string;
  };
}

const AccountRecovery = () => {
  const [requests, setRequests] = useState<AccountRecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedOTP, setCopiedOTP] = useState<string | null>(null);
  const { user, toast } = useAuth();

  useEffect(() => {
    fetchRecoveryRequests();
  }, []);

  const fetchRecoveryRequests = async () => {
    try {
      setLoading(true);
      const { data: recoveryData, error } = await supabase
        .from("account_recovery_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (recoveryData && recoveryData.length > 0) {
        const userIds = recoveryData.map(req => req.user_id).filter(Boolean);

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, position, department_id")
            .in("id", userIds);

          const requestsWithProfiles = recoveryData.map(request => ({
            ...request,
            user_profile: profilesData?.find(profile => profile.id === request.user_id),
            status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED'
          })) as AccountRecoveryRequest[];

          setRequests(requestsWithProfiles);
        } else {
          setRequests(
            recoveryData.map(req => ({
              ...req,
              status: req.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED',
            })) as AccountRecoveryRequest[]
          );
        }
      } else {
        setRequests([]);
      }
    } catch (error: any) {
      console.error("Error fetching recovery requests:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recovery requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyOTPToClipboard = async (otp: string, requestId: string) => {
    try {
      await navigator.clipboard.writeText(otp);
      setCopiedOTP(requestId);
      toast({
        title: "OTP Copied",
        description: "The verification code has been copied to your clipboard",
      });
      setTimeout(() => setCopiedOTP(null), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy OTP to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "default",
      APPROVED: "success",
      REJECTED: "destructive",
      USED: "secondary",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status}
      </Badge>
    );
  };

  const isExpired = (expiresAt: string) => new Date(expiresAt) < new Date();

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64 dark:bg-black">
          <Loader2 className="h-8 w-8 animate-spin text-gray-900 dark:text-gray-100" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 bg-white dark:bg-black min-h-screen p-6 rounded-lg transition-colors duration-300">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Account Recovery</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage password reset requests from users
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="bg-white dark:bg-neutral-900 border dark:border-gray-800">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No Recovery Requests
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No users have requested password recovery at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <Card
                key={request.id}
                className="relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <div>
                        <CardTitle className="text-lg text-gray-900 dark:text-gray-100">
                          {request.user_profile?.name || "Unknown User"}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                          <Mail className="h-4 w-4" />
                          <span>{request.user_email}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(request.status)}
                      {isExpired(request.expires_at) && (
                        <Badge variant="destructive">Expired</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Position
                      </Label>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {request.user_profile?.position || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Requested
                      </Label>
                      <div className="flex items-center space-x-2 text-sm text-gray-800 dark:text-gray-200">
                        <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>
                          {format(new Date(request.requested_at), "MMM dd, yyyy HH:mm")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ✅ FULL DARK-MODE COMPATIBLE OTP SECTION */}
                  <div className="bg-gray-50 dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-gray-700 dark:text-gray-200 flex items-center">
                        <Key className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-300" />
                        Verification Code
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyOTPToClipboard(request.otp_code, request.id)}
                        className="h-8 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {copiedOTP === request.id ? (
                          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedOTP === request.id ? "Copied" : "Copy"}
                      </Button>
                    </div>

                    <div
                      className="font-mono text-2xl font-bold tracking-wider text-center py-2 
                                 bg-white dark:bg-black 
                                 text-gray-900 dark:text-white 
                                 border border-gray-200 dark:border-gray-800 rounded"
                    >
                      {request.otp_code}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Expires: {format(new Date(request.expires_at), "MMM dd, yyyy HH:mm")}
                    </p>
                  </div>

                  {request.handled_at && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-2">
                      Handled on{" "}
                      {format(new Date(request.handled_at), "MMM dd, yyyy HH:mm")}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AccountRecovery;
