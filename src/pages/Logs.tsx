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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
  const { user, isAdmin, profile } = useAuth();
  const adminDepartmentId = profile?.department_id || null;
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  useEffect(() => {
    if (user) {
      fetchLogs();
    }
  }, [user, isAdmin, adminDepartmentId]);

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
      
      let departmentProfiles: any[] = [];
      let allowedUserIds: string[] | null = null;
      
      if (isAdmin) {
        if (!adminDepartmentId) {
          setLogs([]);
          setFilteredLogs([]);
          setLoading(false);
          return;
        }
        
        const { data: deptProfiles, error: deptError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .eq("department_id", adminDepartmentId);
        
        if (deptError) throw deptError;
        
        departmentProfiles = deptProfiles || [];
        allowedUserIds = departmentProfiles.map((profile: any) => profile.id);
        
        if (allowedUserIds.length === 0) {
          setLogs([]);
          setFilteredLogs([]);
          setLoading(false);
          return;
        }
      }
      
      // Fetch logs - Cast to any to bypass TypeScript until types are regenerated
      let query = (supabase as any)
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);

      // Apply department or user filter
      if (isAdmin && allowedUserIds) {
        query = query.in("user_id", allowedUserIds);
      } else if (!isAdmin && user) {
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

      let profilesMap = new Map();
      
      if (isAdmin) {
        departmentProfiles.forEach((deptProfile: any) => {
          profilesMap.set(deptProfile.id, {
            name: deptProfile.name,
            email: deptProfile.email,
          });
        });
      } else {
        // Get unique user IDs - Cast to string array
        const userIds = [...new Set(logsData.map((log: any) => log.user_id))] as string[];
        
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesError } = await supabase
            .from("profiles")
            .select("id, name, email")
            .in("id", userIds);
          
          if (profilesError) {
            console.warn("Error fetching profiles:", profilesError);
          }
          
          if (profilesData) {
            profilesData.forEach(profile => {
              profilesMap.set(profile.id, {
                name: profile.name,
                email: profile.email
              });
            });
          }
        }
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
    setCurrentPage(1);
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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedLogs = filteredLogs.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const renderPagination = () => {
    if (filteredLogs.length <= pageSize) {
      return null;
    }

    const pageNumbers: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }

    return (
      <Pagination className="justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage((prev) => Math.max(1, prev - 1));
              }}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
          {pageNumbers.map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentPage(page);
                }}
                className="min-w-[36px] justify-center"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setCurrentPage((prev) => Math.min(totalPages, prev + 1));
              }}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  return (
    <AppLayout isAdmin={isAdmin}>
      <div className="flex-1 space-y-0">
        <Card className="shadow-none border-none rounded-none">
          <CardHeader className="px-6 py-4 pb-3 border-b border-border/60">
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
          <CardContent className="px-6 py-4 space-y-3">
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="text-xs text-muted-foreground">
              Showing {filteredLogs.length === 0 ? 0 : startIndex + 1}-
              {Math.min(startIndex + pageSize, filteredLogs.length)} of {logs.length} log
              {logs.length !== 1 ? "s" : ""}
            </div>

            {/* Logs Table */}
            <ScrollArea className="rounded-md border max-h-[60vh]">
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
                <div className="min-w-[880px]">
                  <Table className="text-xs md:text-sm">
                    <TableHeader>
                      <TableRow className="h-10">
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">Date & Time</TableHead>
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">User</TableHead>
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">Action</TableHead>
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">Type</TableHead>
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">Details</TableHead>
                        <TableHead className="py-2 text-[11px] uppercase tracking-wide">IP Address</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedLogs.map((log) => (
                        <TableRow key={log.id} className="text-xs md:text-sm h-12">
                          <TableCell className="font-mono text-[11px] whitespace-nowrap py-2 pr-4">
                            {format(new Date(log.created_at), "MMM dd, yyyy HH:mm:ss")}
                          </TableCell>
                          <TableCell className="py-2 pr-4">
                            <div className="space-y-0.5 leading-tight">
                              <div className="font-medium text-xs md:text-sm">{log.profiles?.name || 'Unknown'}</div>
                              <div className="text-[11px] text-muted-foreground">{log.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant={getActionBadgeVariant(log.action)} className="text-[11px] px-2 py-0.5">
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[11px] px-2 py-0.5">{log.entity_type || '-'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate py-2 pr-4 text-xs md:text-sm">
                            {log.details || '-'}
                          </TableCell>
                          <TableCell className="font-mono text-[11px] py-2">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ScrollArea>
            {renderPagination()}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Logs;
