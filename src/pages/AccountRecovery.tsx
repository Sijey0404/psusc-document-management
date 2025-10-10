import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
      
      // Fetch recovery requests
      const { data: recoveryData, error } = await supabase
        .from('account_recovery_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch user profiles for each request
      if (recoveryData && recoveryData.length > 0) {
        const userIds = recoveryData.map(req => req.user_id).filter(Boolean);
        
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, name, position, department_id')
            .in('id', userIds);

          // Combine the data
          const requestsWithProfiles = recoveryData.map(request => ({
            ...request,
            user_profile: profilesData?.find(profile => profile.id === request.user_id),
            status: request.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED'
          })) as AccountRecoveryRequest[];

          setRequests(requestsWithProfiles);
        } else {
          setRequests(recoveryData.map(req => ({
            ...req,
            status: req.status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'USED'
          })) as AccountRecoveryRequest[]);
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

  const updateRequestStatus = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      const { error } = await supabase
        .from('account_recovery_requests')
        .update({
          status,
          handled_by: user?.id,
          handled_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Request has been ${status.toLowerCase()}`,
      });

      // Refresh the list
      fetchRecoveryRequests();
    } catch (error: any) {
      console.error("Error updating request status:", error);
      toast({
        title: "Error",
        description: "Failed to update request status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "default",
      APPROVED: "success", 
      REJECTED: "destructive",
      USED: "secondary"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {status}
      </Badge>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Account Recovery</h1>
          <p className="mt-2 text-muted-foreground">
            Manage password reset requests from users
          </p>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <User className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Recovery Requests</h3>
              <p className="text-muted-foreground text-center">
                No users have requested password recovery at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <Card key={request.id} className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg">
                          {request.user_profile?.name || 'Unknown User'}
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-2">
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
                      <Label className="text-sm font-medium text-muted-foreground">Position</Label>
                      <p className="text-sm">{request.user_profile?.position || 'Not specified'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Requested</Label>
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(request.requested_at), 'MMM dd, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium text-foreground flex items-center">
                        <Key className="h-4 w-4 mr-2" />
                        Verification Code
                      </Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyOTPToClipboard(request.otp_code, request.id)}
                        className="h-8"
                      >
                        {copiedOTP === request.id ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedOTP === request.id ? 'Copied' : 'Copy'}
                      </Button>
                    </div>
                    <div className="font-mono text-2xl font-bold tracking-wider text-center py-2 bg-background border rounded">
                      {request.otp_code}
                    </div>
                    <p className="text-xs text-muted-foreground text-center mt-2">
                      Expires: {format(new Date(request.expires_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>

                  {request.status === 'PENDING' && !isExpired(request.expires_at) && (
                    <div className="flex space-x-2 pt-4">
                      <Button
                        onClick={() => updateRequestStatus(request.id, 'APPROVED')}
                        className="flex-1"
                      >
                        Approve Request
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateRequestStatus(request.id, 'REJECTED')}
                        className="flex-1"
                      >
                        Reject Request
                      </Button>
                    </div>
                  )}

                  {request.handled_at && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      Handled on {format(new Date(request.handled_at), 'MMM dd, yyyy HH:mm')}
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