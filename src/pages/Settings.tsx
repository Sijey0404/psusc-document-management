import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Shield, Phone, Mail, MessageCircle, Lock, Loader2, Eye, EyeOff, KeyRound, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Form schema for password change
const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .refine(password => /[A-Z]/.test(password), "Password must contain at least one uppercase letter")
    .refine(password => /[0-9]/.test(password), "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

const Settings = () => {
  const { isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    publicDocuments: true,
    departmentDocuments: false,
    privateDocuments: true
  });
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      confirmPassword: ""
    }
  });

  const handlePasswordChange = async (values: PasswordFormValues) => {
    try {
      setIsChangingPassword(true);

      // First verify the current password by trying to sign in with it
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("User not found");
      }

      // Try to sign in with current password to verify it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: values.currentPassword
      });

      if (verifyError) {
        throw new Error("Current password is incorrect");
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) throw error;

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully. You will be logged out for security."
      });

      passwordForm.reset();

      // Log out the user for security after password change
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000); // Small delay to let the user see the success message
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handlePermissionChange = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleResetPassword = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out and redirected to password reset",
      });
      navigate('/forgot-password');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoggingOut(false);
      setShowResetPasswordDialog(false);
    }
  };
  return <AppLayout isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-royal">Settings</h1>
        </div>
        
        <Card className="border-royal/10 shadow-sm">
          <CardHeader className="border-b border-royal/10 bg-gradient-to-r from-royal/5 to-transparent">
            <div className="flex items-center space-x-2">
              <SettingsIcon className="h-5 w-5 text-royal" />
              <CardTitle className="text-royal">System Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your document management system settings
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-8">
            {/* Access Permissions */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Access Permissions</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Control who sees what documents
              </p>
              <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="public-docs" className="text-sm font-medium">Public Documents</Label>
                    <p className="text-xs text-muted-foreground">Allow everyone to view public documents</p>
                  </div>
                  <Switch id="public-docs" checked={permissions.publicDocuments} onCheckedChange={() => handlePermissionChange('publicDocuments')} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="dept-docs" className="text-sm font-medium">Department Documents</Label>
                    <p className="text-xs text-muted-foreground">Share documents within your department</p>
                  </div>
                  <Switch id="dept-docs" checked={permissions.departmentDocuments} onCheckedChange={() => handlePermissionChange('departmentDocuments')} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="private-docs" className="text-sm font-medium">Private Documents</Label>
                    <p className="text-xs text-muted-foreground">Keep your documents private by default</p>
                  </div>
                  <Switch id="private-docs" checked={permissions.privateDocuments} onCheckedChange={() => handlePermissionChange('privateDocuments')} />
                </div>
              </div>
            </div>



            {/* Password Change */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Change Password</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Update your account password for better security
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordChange)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showCurrentPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              >
                                {showCurrentPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showNewPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                              >
                                {showNewPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"} 
                                placeholder="••••••••" 
                                {...field} 
                                className="pr-10"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" disabled={isChangingPassword} className="w-full">
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating Password...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Change Password
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Forgot Password</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Reset your password if you can't remember it
              </p>
              <div className="p-4 bg-muted/30 rounded-lg">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowResetPasswordDialog(true)}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </Button>
              </div>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Password Reset
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reset your password? This will log you out of your account and redirect you to the password reset page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoggingOut}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetPassword}
              disabled={isLoggingOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Yes, Reset Password"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>;
};
export default Settings;