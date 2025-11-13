
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const {
    signIn
  } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    try {
      await signIn(email, password);
    } finally {
      setIsLoading(false);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  return <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-royal-light/10 via-background to-golden-light/10 p-4 dark:bg-gradient-to-br dark:from-background dark:via-background dark:to-background">
      <div className="flex items-center mb-8 gap-4">
        <img src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" alt="PSU Logo" className="w-16 h-16" />
        <div>
          <h1 className="text-3xl font-bold text-royal text-left">PSU SAN CARLOS</h1>
          <h2 className="text-xl text-gray-600 text-left">
            Document Management System
          </h2>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden dark:bg-card dark:border dark:border-border/60">
          {/* Decorative gradient top border */}
          <div className="h-1.5 royal-gradient"></div>
          
          <div className="p-8 bg-white dark:bg-card">
            <h2 className="text-2xl font-bold text-center text-royal mb-2 dark:text-golden-light">
              Sign In
            </h2>
            <p className="text-gray-600 text-center mb-6 dark:text-muted-foreground">
              Enter your credentials to access your account
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="dark:text-muted-foreground">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@psu.edu.ph" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="bg-blue-50/50 border-royal/20 focus-visible:ring-royal dark:bg-muted dark:border-border/60 dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:ring-golden"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="dark:text-muted-foreground">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-royal hover:underline dark:text-golden-light dark:hover:text-golden">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                    className="bg-blue-50/50 border-royal/20 focus-visible:ring-royal pr-10 dark:bg-muted dark:border-border/60 dark:text-foreground dark:placeholder:text-muted-foreground dark:focus-visible:ring-golden" 
                  />
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-royal transition-colors dark:text-muted-foreground dark:hover:text-golden-light"
                    onClick={togglePasswordVisibility}
                    tabIndex={-1}
                  >
                    {showPassword ? 
                      <EyeOff className="h-5 w-5" /> : 
                      <Eye className="h-5 w-5" />
                    }
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full bg-royal hover:bg-royal-dark h-12">
                {isLoading ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </> : <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M13.8 12H3" />
                    </svg>
                    Sign In
                  </>}
              </Button>

              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 dark:text-muted-foreground">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-royal hover:text-royal-dark font-medium hover:underline dark:text-golden-light dark:hover:text-golden">
                    Sign up here
                  </Link>
                </p>
              </div>

              <div className="text-xs text-center text-gray-500 mt-4 dark:text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>;
};
export default Login;
