
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { PendingUserService } from "@/services/pendingUserService";
import { useEffect } from "react";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [position, setPosition] = useState("INSTRUCTOR");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch departments
    const fetchDepartments = async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching departments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load departments',
          variant: 'destructive',
        });
      } else {
        // Sort departments to place "Information Technology" first
        const sortedDepartments = [...(data || [])].sort((a, b) => {
          if (a.name === "Information Technology") return -1;
          if (b.name === "Information Technology") return 1;
          return a.name.localeCompare(b.name);
        });
        
        setDepartments(sortedDepartments);
        if (sortedDepartments.length > 0) {
          // Set the first department (which should now be Information Technology if it exists) as default
          setDepartmentId(sortedDepartments[0].id);
        }
      }
    };
    
    fetchDepartments();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if email already exists in pending users (simplified check)
    const pendingUsers = await PendingUserService.getPendingUsers();
    const existingPending = pendingUsers.find(u => u.email === email);

    if (existingPending) {
      toast({
        title: "Registration Pending",
        description: "Your registration is already pending admin approval",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Check if email already exists in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile) {
      toast({
        title: "Email Already Registered",
        description: "Email has already been registered, please use other email.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      await PendingUserService.createPendingUser({
        name,
        email,
        position,
        department_id: departmentId || departments[0]?.id
      });
      
      toast({
        title: "Registration Submitted",
        description: "Your registration has been submitted for admin approval. You will be notified once approved.",
      });
      
      // Clear form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPosition("INSTRUCTOR");
      setDepartmentId(departments[0]?.id || "");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "An error occurred during registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-university-light p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-university-primary">
            PSU San Carlos Campus
          </h1>
          <p className="text-xl text-university-dark mt-1">
            Document Management System
          </p>
        </div>
        
        <Card className="border-university-primary/20">
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>
              Submit your registration for admin approval
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@psu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Select
                  value={position}
                  onValueChange={setPosition}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                    <SelectItem value="ASSISTANT_PROFESSOR">Assistant Professor</SelectItem>
                    <SelectItem value="ASSOCIATE_PROFESSOR">Associate Professor</SelectItem>
                    <SelectItem value="PROFESSOR">Professor</SelectItem>
                    <SelectItem value="CHAIR">Department Chair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={departmentId}
                  onValueChange={setDepartmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> A default password will be generated for your account. 
                    You will need to change it after your first login once approved by an admin.
                  </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Registration"}
              </Button>
              <div className="text-center text-sm">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Pangasinan State University - San Carlos Campus
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

