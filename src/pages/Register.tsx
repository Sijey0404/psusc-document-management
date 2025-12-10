
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
import { generateDepartmentCode } from "@/utils/departmentCode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [position, setPosition] = useState("INSTRUCTOR");
  const [departmentId, setDepartmentId] = useState("");
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [departmentCodeValue, setDepartmentCodeValue] = useState("");
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

    if (!firstName.trim() || !middleName.trim() || !lastName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your first, middle, and last name.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!employeeId.trim() || employeeId.trim().length !== 8) {
      toast({
        title: "Invalid Employee ID",
        description: "Employee ID must be exactly 8 characters.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    if (!departmentId) {
      toast({
        title: "Missing Department",
        description: "Please select a department.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

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

    setLoading(false);
    setDepartmentCodeValue("");
    setIsCodeModalOpen(true);
  };

  const handleDepartmentCodeSubmit = async () => {
    if (!departmentId) {
      toast({
        title: "Missing Department",
        description: "Please select a department.",
        variant: "destructive",
      });
      return;
    }

    const expectedCode = generateDepartmentCode(departmentId);
    if (!departmentCodeValue || departmentCodeValue.trim() !== expectedCode) {
      toast({
        title: "Invalid Department Code",
        description: "The department code you entered is incorrect. Please contact your department admin.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      await PendingUserService.createPendingUser({
        name: `${firstName.trim()} ${middleName.trim()} ${lastName.trim()}`.replace(/\s+/g, " "),
        email,
        position,
        department_id: departmentId || departments[0]?.id,
        employee_id: employeeId.trim()
      });
      
      toast({
        title: "Registration Submitted",
        description: "Your registration has been submitted for admin approval. You will be notified once approved.",
      });
      
      setIsCodeModalOpen(false);
      setDepartmentCodeValue("");

      // Clear form
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setEmployeeId("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPosition("INSTRUCTOR");
      setDepartmentId(departments[0]?.id || "");
    } catch (error: any) {
      console.error("Registration error:", error);
      const isDuplicateEmailError = typeof error?.message === "string" && error.message.toLowerCase().includes("duplicate key value");

      toast({
        title: "Registration failed",
        description: isDuplicateEmailError ? "Duplicated email." : (error.message || "An error occurred during registration"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-university-light p-4 py-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" alt="PSU Logo" className="w-12 h-12" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-university-primary">
              PSU San Carlos Campus
            </h1>
            <p className="text-base text-university-dark mt-0.5">
              Document Management System
            </p>
          </div>
        </div>
        
        <Card className="border-university-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Register</CardTitle>
            <CardDescription className="text-xs">
              Submit your registration for admin approval
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleRegister}>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName" className="text-xs">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Juan"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="middleName" className="text-xs">Middle Name</Label>
                  <Input
                    id="middleName"
                    type="text"
                    placeholder="Santos"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Dela Cruz"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employeeId" className="text-xs">Employee ID</Label>
                <Input
                  id="employeeId"
                  type="text"
                  placeholder="12345678"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value.slice(0, 8))}
                  required
                  maxLength={8}
                  className="h-8 text-sm"
                />
                <p className="text-xs text-muted-foreground">Must be exactly 8 characters</p>
              </div>
              
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@psu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="position" className="text-xs">Position</Label>
                  <Select
                    value={position}
                    onValueChange={setPosition}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="ASSOCIATE_PROFESSOR">Associate Professor</SelectItem>
                      <SelectItem value="ASSISTANT_PROFESSOR">Assistant Professor</SelectItem>
                      <SelectItem value="EXCHANGE_FACULTY">Exchange faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="department" className="text-xs">Department</Label>
                  <Select
                    value={departmentId}
                    onValueChange={(value) => {
                      setDepartmentId(value);
                      setDepartmentCodeValue("");
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm">
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
              </div>

              <div className="space-y-1.5">
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> A default password will be generated. Change it after first login.
                  </p>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex-col space-y-2 pt-3">
              <Button type="submit" className="w-full h-9 text-sm" disabled={loading}>
                {loading ? "Submitting..." : "Submit Registration"}
              </Button>
              <div className="text-center text-xs">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  Sign in here
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
        
        <Dialog
          open={isCodeModalOpen}
          onOpenChange={(open) => {
            if (loading && !open) return;
            setIsCodeModalOpen(open);
            if (!open) {
              setDepartmentCodeValue("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Department Code</DialogTitle>
              <DialogDescription>
                Please enter the 8-digit department code provided by your department administrator to complete your registration.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="department-code-modal">Department Code</Label>
              <Input
                id="department-code-modal"
                type="text"
                value={departmentCodeValue}
                onChange={(e) => setDepartmentCodeValue(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="12345678"
                maxLength={8}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This helps ensure only members of your department can register.
              </p>
            </div>
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (loading) return;
                  setIsCodeModalOpen(false);
                  setDepartmentCodeValue("");
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDepartmentCodeSubmit}
                disabled={loading || departmentCodeValue.length !== 8}
              >
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="mt-3 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Pangasinan State University - San Carlos Campus
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

