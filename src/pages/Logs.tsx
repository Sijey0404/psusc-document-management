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
import { FileText, Search, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
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
    if (user) {
      fetchLogs();
    }
  }, [user, isAdmin]);

  // Refresh logs when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchLogs();
      }
    };
    
    const handleFocus = () => {
      if (user) {
        fetchLogs();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [logs, searchQuery, actionFilter, entityFilter, dateFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch logs - Cast to any to bypass TypeScript until types are regenerated
      let query = (supabase as any)
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      // If not admin, only fetch user's own logs
      if (!isAdmin && user) {
        query = query.eq("user_id", user.id);
      }

      const { data: logsData, error: logsError } = await query;

      if (logsError) {
        console.error("Error fetching logs:", logsError);
        toast({
          title: "Error fetching logs",
          description: logsError.message || "Failed to load activity logs",
          variant: "destructive",
        });
        throw logsError;
      }

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Get unique user IDs - Cast to string array
      const userIds = [...new Set(logsData.map((log: any) => log.user_id))] as string[];

      // Fetch profiles for all users
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

      // Merge logs with profile data - Cast appropriately
      const logsWithProfiles = (logsData as any[]).map((log: any) => ({
        ...log,
        profiles: profilesMap.get(log.user_id) || null
      })) as ActivityLog[];

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
      filtered = filtered.filter(log =>
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.profiles?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.profiles?.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Entity type filter
    if (entityFilter !== "all") {
      filtered = filtered.filter(log => log.entity_type === entityFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.created_at);
        switch (dateFilter) {
          case "today":
            return logDate.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return logDate >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return logDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
  };

  const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (action) {
      case "LOGIN":
        return "default";
      case "LOGOUT":
        return "secondary";
      case "DELETE":
        return "destructive";
      case "CREATE":
      case "APPROVE":
        return "default";
      default:
        return "outline";
    }
  };

  const uniqueActions = [...new Set(logs.map(log => log.action))];
  const uniqueEntityTypes = [...new Set(logs.map(log => log.entity_type).filter(Boolean))];

  return (
    <AppLayout isAdmin={isAdmin}>
      <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6" />
                <div>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>
                    {isAdmin ? "View all user activity logs" : "View your activity logs"}
                  </CardDescription>
                </div>
              </div>
              <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueEntityTypes.map(type => (
                    <SelectItem key={type} value={type || ''}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredLogs.length} of {logs.length} log{logs.length !== 1 ? 's' : ''}
            </div>

            {/* Logs Table */}
            <ScrollArea className="rounded-md border max-h-[65vh]">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <FileText className="h-12 w-12 mb-2" />
                  <p>No activity logs found</p>
                </div>
              ) : (
                <div className="min-w-[960px]">
                  <Table className="text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="py-2">Date & Time</TableHead>
                        <TableHead className="py-2">User</TableHead>
                        <TableHead className="py-2">Action</TableHead>
                        <TableHead className="py-2">Type</TableHead>
                        <TableHead className="py-2">Details</TableHead>
                        <TableHead className="py-2">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id} className="text-xs md:text-sm">
                          <TableCell className="font-mono text-xs whitespace-nowrap py-2">
                            {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="space-y-0.5">
                              <div className="font-medium text-sm">{log.profiles?.name || 'Unknown'}</div>
                              <div className="text-xs text-muted-foreground">{log.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant={getActionBadgeVariant(log.action)} className="text-xs px-2 py-0.5">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-xs px-2 py-0.5">{log.entity_type || '-'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate py-2 text-xs md:text-sm">
                            {log.details || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-xs py-2">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Logs;
