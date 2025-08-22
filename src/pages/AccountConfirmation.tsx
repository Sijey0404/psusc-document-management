import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { PendingUserService } from "@/services/pendingUserService";
import { PendingUser } from "@/types/pendingUser";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, XCircle, Clock, User, Mail, Building, Briefcase } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AccountConfirmation = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const users = await PendingUserService.getPendingUsers();
      setPendingUsers(users);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch pending users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id);
    try {
      await PendingUserService.approvePendingUser(selectedUser.id);
      toast({
        title: "User Approved",
        description: `${selectedUser.name}'s account has been created successfully. Default password: ${selectedUser.default_password}`,
      });
      await fetchPendingUsers();
      setShowApprovalDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(selectedUser.id);
    try {
      await PendingUserService.rejectPendingUser(selectedUser.id);
      toast({
        title: "User Rejected",
        description: `${selectedUser.name}'s registration has been rejected`,
        variant: "destructive",
      });
      await fetchPendingUsers();
      setShowRejectionDialog(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject user",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const openApprovalDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setShowApprovalDialog(true);
  };

  const openRejectionDialog = (user: PendingUser) => {
    setSelectedUser(user);
    setShowRejectionDialog(true);
  };

  if (loading) {
    return (
      <AppLayout isAdmin={true}>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading pending registrations...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isAdmin={true}>
      <div className="space-y-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1">Account Confirmation</h1>
          <p className="text-muted-foreground text-sm">
            Review and approve new user registrations
          </p>
        </div>

        {pendingUsers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pending Registrations</h3>
              <p className="text-muted-foreground">
                There are currently no user registrations waiting for approval.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingUsers.map((user) => (
              <Card key={user.id} className="border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {user.name}
                      </CardTitle>
                      <CardDescription>
                        Registered {formatDistanceToNow(new Date(user.created_at))} ago
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                      <Clock className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{user.position}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">
                        {(user as any).departments?.name || 'No Department'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Default Password:</span>
                      <code className="bg-muted px-2 py-1 rounded text-sm">
                        {user.default_password}
                      </code>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={() => openApprovalDialog(user)}
                      disabled={actionLoading === user.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => openRejectionDialog(user)}
                      disabled={actionLoading === user.id}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Approval Dialog */}
        <AlertDialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve User Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to approve {selectedUser?.name}'s registration? 
                This will create their account with the default password: <strong>{selectedUser?.default_password}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveUser}
                disabled={actionLoading !== null}
                className="bg-green-600 hover:bg-green-700"
              >
                {actionLoading ? "Approving..." : "Approve"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Rejection Dialog */}
        <AlertDialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reject User Registration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to reject {selectedUser?.name}'s registration? 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRejectUser}
                disabled={actionLoading !== null}
                className="bg-red-600 hover:bg-red-700"
              >
                {actionLoading ? "Rejecting..." : "Reject"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default AccountConfirmation;