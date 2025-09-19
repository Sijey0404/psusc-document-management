
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const Settings = () => {
  const { isAdmin } = useAuth();
  
  return (
    <AppLayout isAdmin={isAdmin}>
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
          <CardContent className="pt-6 space-y-6">
            {/* Access Permissions */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-royal">Access Permissions</h3>
              <p className="text-muted-foreground text-sm">
                Control who sees what documents
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Configure document visibility and access controls for different user roles.
                </p>
              </div>
            </div>

            {/* Privacy Policy */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-royal">Privacy Policy</h3>
              <p className="text-muted-foreground text-sm">
                Essential for data protection
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Review our data handling practices and privacy commitments.
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-royal">Contact Information</h3>
              <p className="text-muted-foreground text-sm">
                Support for users
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Get help and support from our technical team.
                </p>
              </div>
            </div>

            {/* Dark Mode */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-royal">Dark Mode</h3>
              <p className="text-muted-foreground text-sm">
                Toggle between light and dark themes
              </p>
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Customize your viewing experience with theme preferences.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
