import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Info } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const Logs = () => {
  const { isAdmin } = useAuth();

  return (
    <AppLayout isAdmin={isAdmin}>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              <CardTitle>Activity Logs</CardTitle>
            </div>
            <CardDescription>
              {isAdmin ? "View all user activity logs" : "View your activity logs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Feature Setup Required</AlertTitle>
              <AlertDescription>
                The activity logs feature requires database setup. Please create the <code>activity_logs</code> table in your Supabase database to enable this feature.
                <br /><br />
                <strong>Required SQL:</strong>
                <pre className="mt-2 bg-muted p-3 rounded text-xs overflow-x-auto">
{`CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own logs
CREATE POLICY "Users can view own logs"
  ON activity_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view all logs"
  ON activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = true
    )
  );`}
                </pre>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Logs;
