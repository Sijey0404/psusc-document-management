
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { RecentDocumentsList } from "@/components/dashboard/RecentDocumentsList";
import { RecentNotificationsList } from "@/components/dashboard/RecentNotificationsList";
import { useFacultyDashboardData } from "@/hooks/useFacultyDashboardData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/document/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const FacultyDashboard = () => {
  const { user } = useAuth();
  const { 
    recentDocuments, 
    notifications, 
    documents, 
    isLoading, 
    stats,
    searchQuery,
    setSearchQuery
  } = useFacultyDashboardData();

  return (
    <AppLayout>
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Faculty Dashboard</h1>
          <span className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <StatsGrid stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentDocumentsList documents={recentDocuments} loading={isLoading.documents} />
          <RecentNotificationsList notifications={notifications} loading={isLoading.notifications} />
        </div>

        <div className="flex flex-col space-y-4">
          <h2 className="text-xl font-bold">All Documents</h2>
          
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by uploader name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading.documents ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading documents...
                    </TableCell>
                  </TableRow>
                ) : documents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No documents found
                    </TableCell>
                  </TableRow>
                ) : (
                  documents.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>{document.title}</TableCell>
                      <TableCell>{document.document_categories?.name || 'N/A'}</TableCell>
                      <TableCell>{document.profiles?.name || 'Unknown'}</TableCell>
                      <TableCell>
                        <StatusBadge status={document.status} />
                      </TableCell>
                      <TableCell>
                        {new Date(document.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default FacultyDashboard;
