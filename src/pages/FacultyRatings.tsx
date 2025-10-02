import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Award, TrendingUp, Clock, CheckCircle } from "lucide-react";

interface FacultyRating {
  id: string;
  faculty_id: string;
  document_id: string;
  deadline: string | null;
  submitted_at: string;
  reviewed_at: string;
  is_on_time: boolean;
  document_status: string;
}


interface RatingStats {
  total_submissions: number;
  on_time_submissions: number;
  late_submissions: number;
  on_time_percentage: number;
}

const FacultyRatings = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [ratings, setRatings] = useState<FacultyRating[]>([]);
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; position?: string }>>({});
  const [docMap, setDocMap] = useState<Record<string, { title: string }>>({});

  useEffect(() => {
    if (user) {
      fetchRatings();
      fetchStats();
    }
  }, [user, isAdmin]);

  const fetchRatings = async () => {
    try {
      setLoading(true);

      let instructorProfiles: { id: string; name: string; position?: string }[] = [];

      if (isAdmin) {
        // Fetch INSTRUCTOR profiles first (avoid relying on schema relationships)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles' as any)
          .select('id, name, position')
          .eq('position', 'INSTRUCTOR');
        if (profilesError) throw profilesError;
        instructorProfiles = (profiles as any) || [];
        // Build quick lookup
        const map: Record<string, { name: string; position?: string }> = {};
        instructorProfiles.forEach(p => (map[p.id] = { name: p.name, position: p.position }));
        setProfileMap(map);

        // If no instructors, nothing to show
        if (instructorProfiles.length === 0) {
          setRatings([]);
          setDocMap({});
          return;
        }
      } else if (user) {
        // For non-admin, fetch own profile for display
        const { data: me, error: meErr } = await supabase
          .from('profiles' as any)
          .select('id, name, position')
          .eq('id', user.id)
          .maybeSingle();
        if (meErr) throw meErr;
        if (me) setProfileMap({ [(me as any).id]: { name: (me as any).name, position: (me as any).position } });
      }

      // Build ratings query
      let ratingsQuery = supabase
        .from('faculty_ratings' as any)
        .select('*')
        .order('reviewed_at', { ascending: false });

      if (isAdmin) {
        const instructorIds = instructorProfiles.map(p => p.id);
        ratingsQuery = ratingsQuery.in('faculty_id', instructorIds);
      } else if (user) {
        ratingsQuery = ratingsQuery.eq('faculty_id', user.id);
      }

      const { data: ratingsData, error: ratingsError } = await ratingsQuery;
      if (ratingsError) throw ratingsError;

      const ratings = (ratingsData as any[]) || [];
      setRatings(ratings as any);

      // Fetch related document titles separately
      const docIds = Array.from(new Set(ratings.map(r => r.document_id))).filter(Boolean);
      if (docIds.length > 0) {
        const { data: docs, error: docsError } = await supabase
          .from('documents' as any)
          .select('id, title')
          .in('id', docIds);
        if (docsError) throw docsError;
        const dMap: Record<string, { title: string }> = {};
        (docs as any[]).forEach(d => (dMap[d.id] = { title: d.title }));
        setDocMap(dMap);
      } else {
        setDocMap({});
      }
    } catch (error: any) {
      console.error('Error fetching ratings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load ratings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      if (!isAdmin) {
        const { data, error } = await supabase
          .rpc('get_faculty_rating_stats' as any, { faculty_user_id: user.id });

        if (error) throw error;
        if (data && Array.isArray(data) && data.length > 0) {
          setStats(data[0] as any);
        }
      }
    } catch (error: any) {
      console.error("Error fetching stats:", error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {!isAdmin && stats && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_submissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.on_time_submissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
                <Clock className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.late_submissions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Time Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.on_time_percentage}%</div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{isAdmin ? "Faculty Submission Ratings" : "My Submission Ratings"}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <p>Loading ratings...</p>
              </div>
            ) : ratings.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && <TableHead>Faculty</TableHead>}
                      <TableHead>Document</TableHead>
                      <TableHead>Submitted</TableHead>
                      {ratings.some(r => r.deadline) && <TableHead>Deadline</TableHead>}
                      <TableHead>Status</TableHead>
                      <TableHead>Timeliness</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ratings.map((rating) => (
                      <TableRow key={rating.id}>
                        {isAdmin && (
                          <TableCell>{profileMap[rating.faculty_id]?.name || "Unknown"}</TableCell>
                        )}
                        <TableCell>{docMap[rating.document_id]?.title || "Unknown"}</TableCell>
                        <TableCell>{formatDate(rating.submitted_at)}</TableCell>
                        {ratings.some(r => r.deadline) && (
                          <TableCell>
                            {rating.deadline ? formatDate(rating.deadline) : "No deadline"}
                          </TableCell>
                        )}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              rating.document_status === "APPROVED"
                                ? "bg-green-50 text-green-600 border-green-200"
                                : "bg-red-50 text-red-600 border-red-200"
                            }
                          >
                            {rating.document_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              rating.is_on_time
                                ? "bg-green-50 text-green-600 border-green-200 flex items-center gap-1 w-fit"
                                : "bg-red-50 text-red-600 border-red-200 flex items-center gap-1 w-fit"
                            }
                          >
                            {rating.is_on_time ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                On Time
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" />
                                Late
                              </>
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No ratings yet</p>
                <p className="text-muted-foreground">
                  Ratings will appear here when documents are reviewed
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default FacultyRatings;
