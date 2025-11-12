import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { User, Session } from '@supabase/supabase-js';
import { User as ProfileType } from '@/types';
import PasswordChangeDialog from '@/components/auth/PasswordChangeDialog';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  profile: ProfileType | null;
  isAdmin: boolean;
  loading: boolean;
  passwordChangeRequired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: any) => Promise<void>;
  signOut: () => Promise<void>;
  toast: (props: any) => void;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [showPasswordChangeDialog, setShowPasswordChangeDialog] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            await fetchUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setPasswordChangeRequired(false);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("Initial session check:", session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect to show password change dialog when required
  useEffect(() => {
    if (passwordChangeRequired) {
      setShowPasswordChangeDialog(true);
    }
  }, [passwordChangeRequired]);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log("Fetching user profile for:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (error) throw error;
      
      if (data) {
        console.log("Profile data retrieved:", data);
        console.log("Admin role check - Raw role value:", data.role);
        console.log("Admin role check - Type of role:", typeof data.role);
        console.log("Admin role check - Boolean conversion:", Boolean(data.role));
        
        setProfile(data as ProfileType);
        const isAdminUser = Boolean(data.role);
        setIsAdmin(isAdminUser);
        
        console.log("Admin status set to:", isAdminUser);
        
        // Check if password change is required
        if (data.password_change_required) {
          console.log("Password change required for this user");
          setPasswordChangeRequired(true);
        } else {
          setPasswordChangeRequired(false);
        }
      } else {
        console.log("No profile found for user");
      }
    } catch (error: any) {
      console.error("Error fetching user profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch user profile",
        variant: "destructive",
      });
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message === "Email not confirmed" && email === "admin@psu.edu.ph") {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('email', email)
              .maybeSingle();
              
            if (profileData) {
              toast({
                title: "Admin account detected",
                description: "Attempting to sign in as admin...",
              });
              
              const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              
              if (!authError && authData.user) {
                toast({
                  title: "Signed in successfully",
                  description: "Welcome back!",
                });
                
                await fetchUserProfile(authData.user.id);
                if (profileData.role === true) {
                  navigate('/admin/dashboard');
                } else {
                  navigate('/dashboard');
                }
                return;
              }
            }
          } catch (innerError) {
            console.error("Error handling admin confirmation:", innerError);
          }
        }
        
        throw error;
      }
      
      toast({
        title: "Signed in successfully",
        description: "Welcome back!",
      });
      
      if (data.user) {
        await fetchUserProfile(data.user.id);
        
        const { data: userProfile, error: profileError } = await supabase
          .from('profiles')
          .select('role, password_change_required, archived')
          .eq('id', data.user.id)
          .maybeSingle();
        
        if (profileError) throw profileError;
        
        console.log("Sign-in profile check - User ID:", data.user.id);
        console.log("Sign-in profile check - Profile data:", userProfile);
        console.log("Sign-in profile check - Role value:", userProfile?.role);
        console.log("Sign-in profile check - Role type:", typeof userProfile?.role);
        
        // Check if user is archived
        if (userProfile?.archived) {
          console.log("User is archived, blocking sign-in");
          await supabase.auth.signOut();
          throw new Error("This account has been archived and cannot access the system");
        }
        
        // Redirect based on role and check if password change required
        if (userProfile) {
          const isAdmin = userProfile.role === true;
          console.log("Sign-in redirect - Is admin:", isAdmin);
          
          if (isAdmin) {
            console.log("Redirecting to admin dashboard");
            navigate('/admin/dashboard');
          } else {
            console.log("Redirecting to user dashboard");
            navigate('/dashboard');
          }
        }
      }
    } catch (error: any) {
      console.error("Error signing in:", error);
      toast({
        title: "Sign in failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
          emailRedirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      
      toast({
        title: "Account created",
        description: "Please check your email for verification",
      });
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast({
        title: "Sign up failed",
        description: error.message || "An error occurred during sign up",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate('/login');
      toast({
        title: "Signed out",
        description: "You have been successfully signed out",
      });
    } catch (error: any) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handlePasswordChangeComplete = () => {
    setPasswordChangeRequired(false);
    setShowPasswordChangeDialog(false);
  };

  // Render password change dialog or children based on authentication state
  const renderContent = () => {
    if (loading) {
      return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }
    
    if (passwordChangeRequired && user) {
      // If password change is required, only show the password change dialog
      return (
        <div className="min-h-screen flex items-center justify-center bg-university-light p-4">
          <PasswordChangeDialog 
            isOpen={true} 
            onClose={handlePasswordChangeComplete}
          />
        </div>
      );
    }
    
    // Otherwise show the regular application content
    return children;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        passwordChangeRequired,
        signIn,
        signUp,
        signOut,
        toast
      }}
    >
      {renderContent()}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
