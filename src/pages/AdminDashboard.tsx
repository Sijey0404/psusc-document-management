
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, CheckCircle, XCircle, Clock, Users, Award, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentSubmission, User } from "@/types";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { motion } from "framer-motion";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useAuth } from "@/context/AuthContext";
import { DocumentListModal } from "@/components/dashboard/DocumentListModal";
import { UserListModal } from "@/components/dashboard/UserListModal";
import { SubmissionListModal } from "@/components/dashboard/SubmissionListModal";

const AdminDashboard = () => {
  const { profile } = useAuth();
  const adminDepartmentId = profile?.department_id || null;
  const navigate = useNavigate();
  const [recentSubmissions, setRecentSubmissions] = useState<DocumentSubmission[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    totalDocuments: 0,
    totalUsers: 0,
    approvalRate: 0,
  });
  const [submissionStats, setSubmissionStats] = useState({
    total_submissions: 0,
    on_time_submissions: 0,
    late_submissions: 0,
    on_time_percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Modal states
  const [modalState, setModalState] = useState<{
    type: 'documents' | 'users' | 'submissions' | null;
    title: string;
    filter?: string;
  }>({ type: null, title: '' });
  
  const [modalData, setModalData] = useState<{
    documents: any[];
    users: any[];
    submissions: any[];
  }>({ documents: [], users: [], submissions: [] });
  
  const [modalLoading, setModalLoading] = useState(false);

  const fetchDashboardData = async (departmentId: string) => {
    setLoading(true);
    
    try {
        // Fetch document stats by status
        const { count: pendingCount, error: pendingError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING')
          .eq('department_id', departmentId);
        
        const { count: approvedCount, error: approvedError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'APPROVED')
          .eq('department_id', departmentId);
        
        const { count: rejectedCount, error: rejectedError } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'REJECTED')
          .eq('department_id', departmentId);
        
        if (pendingError || approvedError || rejectedError) 
          throw pendingError || approvedError || rejectedError;
        
        const stats = {
          pending: pendingCount || 0,
          approved: approvedCount || 0,
          rejected: rejectedCount || 0,
          totalDocuments: 0,
          totalUsers: 0,
          approvalRate: 0,
        };
        
        stats.totalDocuments = stats.pending + stats.approved + stats.rejected;
        
        if (stats.totalDocuments > 0) {
          const processed = stats.approved + stats.rejected;
          stats.approvalRate = processed > 0 
            ? Math.round((stats.approved / processed) * 100) 
            : 0;
        }
        
        // Fetch total faculty users
        const { count: usersCount, error: usersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', false)
          .eq('department_id', departmentId);
        
        if (usersError) throw usersError;
        
        stats.totalUsers = usersCount || 0;
        
        setSummaryStats(stats);
        
        // Fetch recent submissions
        const { data: documents, error: docsError } = await supabase
          .from('documents')
          .select(`
            id,
            title,
            description,
            status,
            created_at,
            submitted_by,
            category_id,
            profiles:submitted_by (name, email)
          `)
          .eq('department_id', departmentId)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (docsError) throw docsError;
        
        if (documents) {
          const formattedSubmissions: DocumentSubmission[] = documents.map((doc: any) => ({
            id: doc.id,
            document_id: doc.id,
            document: {
              id: doc.id,
              title: doc.title,
              description: doc.description,
              status: doc.status,
              created_at: doc.created_at,
              submitted_by: doc.submitted_by,
              file_path: "",
              file_type: "",
              file_size: 0,
              category_id: doc.category_id,
              department_id: "",
              updated_at: doc.created_at,
              profiles: doc.profiles
            },
            user: {
              id: doc.submitted_by,
              name: doc.profiles?.name || "Unknown User",
              email: doc.profiles?.email || "",
              role: false,
              department_id: "",
              created_at: "",
              updated_at: "",
              position: "PROFESSOR"
            },
            submitted_at: doc.created_at,
            status: doc.status
          }));
          
          setRecentSubmissions(formattedSubmissions);
        }

        // Fetch faculty ratings for submission statistics
        const { data: instructorProfiles, error: profilesError } = await supabase
          .from('profiles' as any)
          .select('id')
          .eq('position', 'INSTRUCTOR')
          .eq('department_id', departmentId);
        
        if (!profilesError && instructorProfiles && instructorProfiles.length > 0) {
          const instructorIds = instructorProfiles.map((p: any) => p.id);
          
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('faculty_ratings' as any)
            .select('*');
          
          if (!ratingsError && ratingsData) {
            const ratings = (ratingsData as any[]).filter((r: any) => instructorIds.includes(r.faculty_id));
            
            // Fetch document categories to get deadlines
            const docIds = Array.from(new Set(ratings.map(r => r.document_id))).filter(Boolean);
            if (docIds.length > 0) {
              const { data: docs, error: docsError } = await supabase
                .from('documents' as any)
                .select('id, category_id, document_categories(deadline)')
                .in('id', docIds);
              
              if (!docsError && docs) {
                const dMap: Record<string, string> = {};
                (docs as any[]).forEach(d => {
                  if (d.document_categories?.deadline) {
                    dMap[d.id] = d.document_categories.deadline;
                  }
                });
                
                // Recalculate is_on_time based on actual category deadline
                const updatedRatings = ratings.map((rating: any) => {
                  const categoryDeadline = dMap[rating.document_id];
                  if (categoryDeadline) {
                    const submittedDate = new Date(rating.submitted_at);
                    const deadlineDate = new Date(categoryDeadline);
                    return {
                      ...rating,
                      is_on_time: submittedDate <= deadlineDate
                    };
                  }
                  return rating;
                });
                
                const totalSubmissions = updatedRatings.length;
                const onTimeSubmissions = updatedRatings.filter((r: any) => r.is_on_time).length;
                const lateSubmissions = totalSubmissions - onTimeSubmissions;
                const onTimePercentage = totalSubmissions > 0 
                  ? Math.round((onTimeSubmissions / totalSubmissions) * 100) 
                  : 0;
                
                setSubmissionStats({
                  total_submissions: totalSubmissions,
                  on_time_submissions: onTimeSubmissions,
                  late_submissions: lateSubmissions,
                  on_time_percentage: onTimePercentage
                });
              }
            }
          }
        }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      // Add a timeout for the initial loading screen for better UX
      setTimeout(() => {
        setInitialLoading(false);
      }, 800);
    }
  };

  const fetchModalData = async (type: 'documents' | 'users' | 'submissions', filter?: string) => {
    if (!adminDepartmentId) return;
    
    setModalLoading(true);
    try {
      if (type === 'documents') {
        let query = supabase
          .from('documents')
          .select('id, title, status, created_at, profiles:submitted_by(name, email)')
          .eq('department_id', adminDepartmentId);
        
        if (filter && filter !== 'all') {
          query = query.eq('status', filter.toUpperCase());
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) throw error;
        setModalData(prev => ({ ...prev, documents: data || [] }));
      } else if (type === 'users') {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, position')
          .eq('role', false)
          .eq('department_id', adminDepartmentId);
        
        if (error) throw error;
        setModalData(prev => ({ ...prev, users: data || [] }));
      } else if (type === 'submissions') {
        const { data: instructorProfiles, error: profilesError } = await supabase
          .from('profiles' as any)
          .select('id, name')
          .eq('position', 'INSTRUCTOR')
          .eq('department_id', adminDepartmentId);
        
        if (profilesError) throw profilesError;
        
        const instructorIds = instructorProfiles?.map((p: any) => p.id) || [];
        
        const { data: ratingsData, error: ratingsError } = await supabase
          .from('faculty_ratings' as any)
          .select('*');
        
        if (ratingsError) throw ratingsError;
        
        const ratings = (ratingsData || []).filter((r: any) => instructorIds.includes(r.faculty_id));
        
        // Get document categories for deadlines
        const docIds = Array.from(new Set(ratings.map((r: any) => r.document_id))).filter(Boolean);
        let dMap: Record<string, string> = {};
        
        if (docIds.length > 0) {
          const { data: docs } = await supabase
            .from('documents' as any)
            .select('id, category_id, document_categories(deadline)')
            .in('id', docIds);
          
          if (docs) {
            (docs as any[]).forEach(d => {
              if (d.document_categories?.deadline) {
                dMap[d.id] = d.document_categories.deadline;
              }
            });
          }
        }
        
        const submissionsWithTimeliness = ratings.map((rating: any) => {
          const instructor = (instructorProfiles as any[])?.find((p: any) => p.id === rating.faculty_id);
          const deadline = dMap[rating.document_id];
          let isOnTime = rating.is_on_time;
          
          if (deadline) {
            const submittedDate = new Date(rating.submitted_at);
            const deadlineDate = new Date(deadline);
            isOnTime = submittedDate <= deadlineDate;
          }
          
          return {
            id: rating.id,
            document_id: rating.document_id,
            faculty_name: instructor?.name || 'Unknown',
            submitted_at: rating.submitted_at,
            is_on_time: isOnTime,
          };
        });
        
        let filteredSubmissions = submissionsWithTimeliness;
        if (filter === 'ontime') {
          filteredSubmissions = submissionsWithTimeliness.filter(s => s.is_on_time);
        } else if (filter === 'late') {
          filteredSubmissions = submissionsWithTimeliness.filter(s => !s.is_on_time);
        }
        
        setModalData(prev => ({ ...prev, submissions: filteredSubmissions }));
      }
    } catch (error: any) {
      console.error('Error fetching modal data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async (type: 'documents' | 'users' | 'submissions', title: string, filter?: string) => {
    setModalState({ type, title, filter });
    await fetchModalData(type, filter);
  };

  const closeModal = () => {
    setModalState({ type: null, title: '' });
  };

  useEffect(() => {
    if (!adminDepartmentId) {
      setSummaryStats({
        pending: 0,
        approved: 0,
        rejected: 0,
        totalDocuments: 0,
        totalUsers: 0,
        approvalRate: 0,
      });
      setRecentSubmissions([]);
      setSubmissionStats({
        total_submissions: 0,
        on_time_submissions: 0,
        late_submissions: 0,
        on_time_percentage: 0,
      });
      setLoading(false);
      setInitialLoading(false);
      return;
    }
    fetchDashboardData(adminDepartmentId);
  }, [adminDepartmentId]);

  if (initialLoading) {
    return <LoadingScreen message="Preparing Admin Dashboard" />;
  }

  return (
    <AppLayout isAdmin={true}>
      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
          <p className="text-muted-foreground mb-4 text-sm">Monitor documents and system metrics</p>
        </motion.div>

        {/* Submission Ratings */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-lg font-semibold mb-3">Submission Ratings</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('submissions', 'All Submissions', 'all')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissionStats.total_submissions}</div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('submissions', 'On Time Submissions', 'ontime')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{submissionStats.on_time_submissions}</div>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('submissions', 'Late Submissions', 'late')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{submissionStats.late_submissions}</div>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{submissionStats.on_time_percentage}%</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Summary stats grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card 
              className="overflow-hidden shadow-sm bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-800 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('documents', 'Pending Documents', 'pending')}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch h-full">
                  <div className="bg-amber-100 dark:bg-amber-800/50 p-3 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                  </div>
                  <div className="p-3 flex flex-col justify-center flex-1">
                    <p className="text-xs font-medium text-muted-foreground dark:text-amber-200 mb-1">Pending</p>
                    <motion.p 
                      className="text-xl font-bold dark:text-amber-50"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        delay: 0.2 
                      }}
                    >
                      {summaryStats.pending}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="overflow-hidden shadow-sm bg-green-50 dark:bg-green-900/30 border-green-100 dark:border-green-800 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('documents', 'Approved Documents', 'approved')}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch h-full">
                  <div className="bg-green-100 dark:bg-green-800/50 p-3 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-500 dark:text-green-400" />
                  </div>
                  <div className="p-3 flex flex-col justify-center flex-1">
                    <p className="text-xs font-medium text-muted-foreground dark:text-green-200 mb-1">Approved</p>
                    <motion.p 
                      className="text-xl font-bold dark:text-green-50"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        delay: 0.3 
                      }}
                    >
                      {summaryStats.approved}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="overflow-hidden shadow-sm bg-red-50 dark:bg-red-900/30 border-red-100 dark:border-red-800 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('documents', 'Rejected Documents', 'rejected')}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch h-full">
                  <div className="bg-red-100 dark:bg-red-800/50 p-3 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-500 dark:text-red-400" />
                  </div>
                  <div className="p-3 flex flex-col justify-center flex-1">
                    <p className="text-xs font-medium text-muted-foreground dark:text-red-200 mb-1">Rejected</p>
                    <motion.p 
                      className="text-xl font-bold dark:text-red-50"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        delay: 0.4 
                      }}
                    >
                      {summaryStats.rejected}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card 
              className="overflow-hidden shadow-sm bg-blue-50 dark:bg-blue-900/30 border-blue-100 dark:border-blue-800 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleCardClick('users', 'Faculty Users')}
            >
              <CardContent className="p-0">
                <div className="flex items-stretch h-full">
                  <div className="bg-blue-100 dark:bg-blue-800/50 p-3 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                  </div>
                  <div className="p-3 flex flex-col justify-center flex-1">
                    <p className="text-xs font-medium text-muted-foreground dark:text-blue-200 mb-1">Faculty Users</p>
                    <motion.p 
                      className="text-xl font-bold dark:text-blue-50"
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 200, 
                        delay: 0.4 
                      }}
                    >
                      {summaryStats.totalUsers}
                    </motion.p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>
        
        {/* Recent activities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-3"
        >
          {/* Approval rate card */}
          <Card className="lg:col-span-1 shadow-sm">
            <CardHeader className="bg-muted/20 border-b py-3">
              <CardTitle className="text-base">Approval Rate</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner text="Loading stats..." />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-xl font-bold">{summaryStats.approvalRate}%</span>
                  </div>
                  <Progress value={summaryStats.approvalRate} className="h-2" />
                  <div className="pt-2 grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Approved</span>
                      <span className="font-medium text-base flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                        {summaryStats.approved}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Rejected</span>
                      <span className="font-medium text-base flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                        {summaryStats.rejected}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Recent submissions */}
          <Card className="lg:col-span-2 shadow-sm">
            <CardHeader className="bg-muted/20 border-b py-3">
              <CardTitle className="text-base">Recent Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[360px] overflow-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <LoadingSpinner text="Loading submissions..." />
                </div>
              ) : recentSubmissions.length > 0 ? (
                <motion.div 
                  className="divide-y"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                >
                  {recentSubmissions.map((submission, index) => (
                    <motion.div
                      key={submission.id}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      transition={{ duration: 0.3 }}
                      className="p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => navigate(`/documents/${submission.document_id}`)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="bg-primary/10 rounded-full p-1.5 mt-1">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="min-w-0">
                              <h3 className="font-medium text-sm truncate">{submission.document.title}</h3>
                              <p className="text-xs text-muted-foreground truncate">
                                Submitted by {submission.user.name || 'Unknown'}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge 
                                variant={
                                  submission.status === "APPROVED" ? "success" : 
                                  submission.status === "REJECTED" ? "destructive" : 
                                  "outline"
                                }
                                className={
                                  submission.status === "APPROVED" ? "bg-green-100 text-green-800 border-green-200 text-[10px]" : 
                                  submission.status === "REJECTED" ? "bg-red-100 text-red-800 border-red-200 text-[10px]" : 
                                  "bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                                }
                              >
                                {submission.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground mt-1">
                                {new Date(submission.submitted_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {submission.document.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {submission.document.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2 opacity-50" />
                  <p className="text-sm text-muted-foreground">No recent submissions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Modals */}
      <DocumentListModal
        isOpen={modalState.type === 'documents'}
        onClose={closeModal}
        title={modalState.title}
        documents={modalData.documents}
        loading={modalLoading}
      />
      
      <UserListModal
        isOpen={modalState.type === 'users'}
        onClose={closeModal}
        title={modalState.title}
        users={modalData.users}
        loading={modalLoading}
      />
      
      <SubmissionListModal
        isOpen={modalState.type === 'submissions'}
        onClose={closeModal}
        title={modalState.title}
        submissions={modalData.submissions}
        loading={modalLoading}
      />
    </AppLayout>
  );
};

export default AdminDashboard;
