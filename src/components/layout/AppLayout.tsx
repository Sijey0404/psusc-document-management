import { ReactNode, useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FileText, Folder, Home, LogOut, Settings, Users, Moon, Sun, UserCheck, Key, HardDrive } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";
import { FacultyNotificationDropdown } from "@/components/dashboard/FacultyNotificationDropdown";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type AppLayoutProps = {
  children: ReactNode;
  isAdmin?: boolean;
};

export const AppLayout = ({
  children,
  isAdmin
}: AppLayoutProps) => {
  let navigate;
  let location;
  try {
    navigate = useNavigate();
    location = useLocation();
  } catch (error) {
    navigate = () => {};
    location = {
      pathname: window.location.pathname
    };
  }

  const { toast } = useToast();
  const { user, profile, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode === 'true';
  });

  const { isAdmin: contextIsAdmin } = useAuth();
  const adminStatus = isAdmin !== undefined ? isAdmin : contextIsAdmin;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const handleLogout = async () => {
    setIsLoading(true);
    setShowLogoutDialog(false);
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account"
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const getInitials = () => {
    if (!profile?.name) return user?.email?.substring(0, 2).toUpperCase() || "??";
    const names = profile.name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return names[0].substring(0, 2).toUpperCase();
  };
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar isAdmin={adminStatus} />
        <div className="flex flex-col flex-1">
          <header className="h-14 border-b bg-background dark:bg-card flex items-center justify-between px-4 lg:px-6 shadow-sm sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="hover:bg-muted rounded-md p-2 transition-colors duration-200" />
              <div className="flex items-center gap-2">
                <motion.img 
                  initial={{ scale: 0.9, opacity: 0 }} 
                  animate={{ scale: 1, opacity: 1 }} 
                  transition={{ duration: 0.3 }}
                  src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" 
                  alt="PSU Logo" 
                  className="h-8 max-h-[32px] w-auto hidden sm:block" 
                />
                <motion.h1 
                  initial={{ x: -10, opacity: 0 }} 
                  animate={{ x: 0, opacity: 1 }} 
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="font-semibold text-lg hidden sm:inline-block text-royal"
                >
                  PSU Document Management System
                </motion.h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {adminStatus ? <NotificationDropdown /> : <FacultyNotificationDropdown />}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleDarkMode} 
                  className="relative overflow-hidden hover:bg-muted transition-colors duration-200 h-9 w-9"
                >
                  {darkMode ? <Sun className="h-4 w-4 text-golden" /> : <Moon className="h-4 w-4" />}
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Avatar className="cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-royal text-white text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setShowLogoutDialog(true)} 
                  disabled={isLoading} 
                  className="relative overflow-hidden hover:bg-muted transition-colors duration-200 h-9 w-9"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoading && (
                    <span className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </span>
                  )}
                </Button>
              </motion.div>
              
              <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to log out of your account?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={handleLogout}>Yes</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <main className="flex-1 p-3 md:p-4 lg:p-5 overflow-auto">
            <motion.div 
              key={location.pathname} 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }} 
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppSidebar = ({ isAdmin }: { isAdmin: boolean }) => {
  const { profile } = useAuth();
  
  let location;
  try {
    location = useLocation();
  } catch (error) {
    location = {
      pathname: window.location.pathname
    };
  }
  
  const menuItems = [
    { path: isAdmin ? "/admin/dashboard" : "/dashboard", icon: Home, label: "Dashboard" },
    { path: "/documents", icon: FileText, label: "Documents" },
    ...(isAdmin ? [
      { path: "/users", icon: Users, label: "Users" },
      { path: "/account-confirmation", icon: UserCheck, label: "Account Confirmation" },
      { path: "/account-recovery", icon: Key, label: "Account Recovery" },
      { path: "/folders", icon: Folder, label: "Folders" },
      { path: "/admin/file-storage", icon: HardDrive, label: "My Storage" }
    ] : [
      { path: "/faculty-folders", icon: Folder, label: "Folders" }
    ]),
    { path: "/settings", icon: Settings, label: "Settings" }
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };
  
  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-4 royal-gradient">
        <div className="flex items-center justify-center px-3">
          <img 
            src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" 
            alt="PSU Logo" 
            className="h-8 max-h-[32px] w-auto" 
          />
          <div className="flex flex-col ml-2 justify-center">
            <span className="font-bold text-sm text-white">PSU San Carlos</span>
            <span className="text-[10px] text-golden">Document System</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="royal-gradient">
        <SidebarGroup className="royal-gradient">
          <SidebarGroupLabel className="text-golden">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map(item => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton 
                    className={isActive(item.path) ? "bg-sidebar-accent text-golden" : "text-white hover:text-golden"} 
                    asChild 
                    tooltip={item.label}
                  >
                    <Link to={item.path} className="group">
                      <item.icon className="h-4 w-4 group-hover:animate-pulse duration-300" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="bg-royal-dark">
        <div className="px-3 py-2 border-t border-sidebar-border">
          <div className="text-xs text-golden opacity-90">
            {isAdmin ? "Admin Access" : "Faculty Access"}
          </div>
          <div className="text-xs mt-1 font-medium truncate text-white">
            {profile?.name || "User"}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
