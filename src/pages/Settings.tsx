import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Shield, FileText, Phone, Moon, Sun, Monitor, Mail, MessageCircle, Lock, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
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
  const { isAdmin } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    publicDocuments: true,
    departmentDocuments: false,
    privateDocuments: true
  });

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
        description: "Your password has been changed successfully"
      });

      passwordForm.reset();
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

  useEffect(() => {
    setMounted(true);
  }, []);
  const handlePermissionChange = (key: keyof typeof permissions) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
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

            {/* Privacy Policy */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Privacy Policy</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Essential for data protection
              </p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    View Privacy Policy
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Privacy Policy</DialogTitle>
                    <DialogDescription>
                      Our commitment to protecting your data and privacy
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold mb-2">Data Collection</h4>
                      <p className="text-muted-foreground">
                        We collect information you provide directly to us, such as when you create an account, 
                        submit documents, or contact us for support.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Data Usage</h4>
                      <p className="text-muted-foreground">
                        We use your information to provide, maintain, and improve our services, 
                        process your document submissions, and communicate with you.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Data Security</h4>
                      <p className="text-muted-foreground">
                        We implement appropriate technical and organizational measures to protect 
                        your personal information against unauthorized access, alteration, disclosure, or destruction.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Contact Us</h4>
                      <p className="text-muted-foreground">
                        If you have any questions about this Privacy Policy, please contact our support team.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Contact Information</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Support for users
              </p>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Support</p>
                    <p className="text-sm text-muted-foreground">sancarlosPsu@gmail.com</p>
                  </div>
                </div>
                <Separator />
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Phone Support</p>
                    <p className="text-sm text-muted-foreground">09952176139</p>
                  </div>
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
                            <Input type="password" placeholder="••••••••" {...field} />
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
                            <Input type="password" placeholder="••••••••" {...field} />
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
                            <Input type="password" placeholder="••••••••" {...field} />
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

            {/* Dark Mode */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Moon className="h-5 w-5 text-royal" />
                <h3 className="text-lg font-semibold text-royal">Theme Preferences</h3>
              </div>
              <p className="text-muted-foreground text-sm">
                Choose your preferred theme appearance
              </p>
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                {mounted && <div className="grid grid-cols-3 gap-3">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </Button>
                    <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')} className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </Button>
                  </div>}
                <p className="text-xs text-muted-foreground mt-2">
                  Current theme: {mounted ? theme : 'Loading...'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>;
};
export default Settings;