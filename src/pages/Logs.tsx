import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Search, Filter, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

const Logs = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  useEffect(() => {
    fetchLogs();
  }, [user, isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, actionFilter, entityFilter, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch logs
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      // If not admin, only fetch user's own logs
      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Get unique user IDs (user_id references auth.users, but we need profiles for name/email)
      const userIds = [...new Set(logsData.map(log => log.user_id))];

      // Fetch profiles for all users (profiles.id should match auth.users.id)
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", userIds);

      if (profilesError) {
        console.warn("Error fetching profiles:", profilesError);
      }

      // Create a map of user_id to profile
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, {
            name: profile.name,
            email: profile.email
          });
        });
      }

      // Merge logs with profile data
      const logsWithProfiles = logsData.map(log => ({
        ...log,
        profiles: profilesMap.get(log.user_id) || null
      }));

      setLogs(logsWithProfiles);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(query) ||
          log.entity_type.toLowerCase().includes(query) ||
          log.details?.toLowerCase().includes(query) ||
          (log.profiles?.name?.toLowerCase().includes(query)) ||
          (log.profiles?.email?.toLowerCase().includes(query))
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Entity type filter
    if (entityFilter !== "all") {
      filtered = filtered.filter((log) => log.entity_type === entityFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case "today":
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(
            (log) => new Date(log.created_at) >= filterDate
          );
          break;
        case "week":
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(
            (log) => new Date(log.created_at) >= filterDate
          );
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(
            (log) => new Date(log.created_at) >= filterDate
          );
          break;
      }
    }

    setFilteredLogs(filtered);
  };

  const getActionColor = (action: string) => {
    if (action.includes("CREATE") || action.includes("SUBMIT") || action.includes("APPROVE")) {
      return "bg-green-500/10 text-green-700 dark:text-green-400";
    }
    if (action.includes("UPDATE") || action.includes("EDIT")) {
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400";
    }
    if (action.includes("DELETE") || action.includes("REJECT") || action.includes("ARCHIVE")) {
      return "bg-red-500/10 text-red-700 dark:text-red-400";
    }
    if (action.includes("LOGIN") || action.includes("LOGOUT")) {
      return "bg-purple-500/10 text-purple-700 dark:text-purple-400";
    }
    return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
  };

  const getUniqueActions = () => {
    const actions = new Set(logs.map((log) => log.action));
    return Array.from(actions).sort();
  };

  const getUniqueEntityTypes = () => {
    const entities = new Set(logs.map((log) => log.entity_type));
    return Array.from(entities).sort();
  };

  const exportLogs = () => {
    const csvContent = [
      ["Date", "Time", "User", "Action", "Entity Type", "Details", "IP Address"],
      ...filteredLogs.map((log) => [
        format(new Date(log.created_at), "yyyy-MM-dd"),
        format(new Date(log.created_at), "HH:mm:ss"),
        isAdmin ? (log.profiles?.name || log.profiles?.email || "Unknown") : "You",
        log.action,
        log.entity_type,
        log.details || "",
        log.ip_address || "",
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_logs_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Logs have been exported to CSV",
    });
  };

  return (
    <AppLayout isAdmin={isAdmin}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Activity Logs</h1>
            <p className="text-muted-foreground">
              {isAdmin ? "View all user activity logs" : "View your personal activity logs"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={exportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter logs by action, entity type, or date</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {getUniqueActions().map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entity Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entity Types</SelectItem>
                  {getUniqueEntityTypes().map((entity) => (
                    <SelectItem key={entity} value={entity}>
                      {entity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Logs ({filteredLogs.length} {filteredLogs.length === 1 ? "entry" : "entries"})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No logs found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      {isAdmin && <TableHead>User</TableHead>}
                      <TableHead>Action</TableHead>
                      <TableHead>Entity Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {format(new Date(log.created_at), "MMM dd, yyyy")}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(log.created_at), "HH:mm:ss")}
                            </span>
                          </div>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {log.profiles?.name || "Unknown"}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {log.profiles?.email || ""}
                              </span>
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>{log.entity_type}</TableCell>
                        <TableCell className="max-w-md">
                          <div className="truncate" title={log.details || ""}>
                            {log.details || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Logs;

