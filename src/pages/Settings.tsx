
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
          <CardContent className="pt-6">
            <div className="p-8 text-center">
              <h3 className="text-xl font-medium text-royal/70 mb-2">
                Settings Page – Under Construction
              </h3>
              <p className="text-muted-foreground">
                This section will be available soon. Please check back later.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
