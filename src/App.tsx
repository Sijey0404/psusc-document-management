
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import FacultyDashboard from "./pages/FacultyDashboard";
import Documents from "./pages/Documents";
import DocumentDetails from "./pages/DocumentDetails";
import DocumentSubmission from "./pages/DocumentSubmission";
import UserManagement from "./pages/UserManagement";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Folders from "./pages/Folders";
import FacultyFolders from "./pages/FacultyFolders";
import AccountConfirmation from "./pages/AccountConfirmation";
import AccountRecovery from "./pages/AccountRecovery";
import AdminFileStorage from "./pages/AdminFileStorage";
import FacultyRatings from "./pages/FacultyRatings";

const queryClient = new QueryClient();

// Private route component for authenticated users
const PrivateRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

// Admin route component
const AdminRoute = () => {
  const { isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// Faculty route component
const FacultyRoute = () => {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return user && !isAdmin ? <Outlet /> : (user && isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/login" replace />);
};

// Auth route component (for login/register pages)
const AuthRoute = () => {
  const { user, loading, isAdmin } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    return isAdmin ? <Navigate to="/admin/dashboard" replace /> : <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

// Wrap the entire app in the necessary providers
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Auth routes (redirect if authenticated) */}
            <Route element={<AuthRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>
            
            {/* Admin routes */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/folders" element={<Folders />} />
              <Route path="/admin/file-storage" element={<AdminFileStorage />} />
              <Route path="/account-confirmation" element={<AccountConfirmation />} />
              <Route path="/account-recovery" element={<AccountRecovery />} />
            </Route>
            
            {/* Faculty routes */}
            <Route element={<FacultyRoute />}>
              <Route path="/dashboard" element={<FacultyDashboard />} />
              <Route path="/faculty-folders" element={<FacultyFolders />} />
            </Route>
            
            {/* Private routes (accessible by both admin and faculty) */}
            <Route element={<PrivateRoute />}>
              <Route path="/documents" element={<Documents />} />
              <Route path="/documents/new" element={<DocumentSubmission />} />
              <Route path="/documents/:id" element={<DocumentDetails />} />
              <Route path="/ratings" element={<FacultyRatings />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
