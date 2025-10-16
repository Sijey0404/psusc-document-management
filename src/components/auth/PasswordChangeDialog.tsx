import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Form schema for password change
const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters").refine(password => /[A-Z]/.test(password), "Password must contain at least one uppercase letter").refine(password => /[0-9]/.test(password), "Password must contain at least one number"),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});
type PasswordFormValues = z.infer<typeof passwordSchema>;
interface PasswordChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}
const PasswordChangeDialog = ({
  isOpen,
  onClose
}: PasswordChangeDialogProps) => {
  const {
    toast
  } = useToast();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    }
  });
  const handlePasswordChange = async (values: PasswordFormValues) => {
    try {
      setIsSubmitting(true);

      // Update password
      const {
        error
      } = await supabase.auth.updateUser({
        password: values.password
      });
      if (error) throw error;

      // Update the password_change_required flag
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (user) {
        const {
          error: profileError
        } = await supabase.from("profiles").update({
          password_change_required: false
        }).eq("id", user.id);
        if (profileError) throw profileError;

        // Fetch user profile to determine redirect
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, position")
          .eq("id", user.id)
          .single();

        toast({
          title: "Password updated",
          description: "Your password has been changed successfully"
        });
        form.reset();
        onClose();

        // Redirect based on user type
        if (profile?.role === true) {
          navigate("/admin/dashboard");
        } else {
          // All non-admin users go to the standard dashboard
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <Dialog open={isOpen} onOpenChange={open => {
    // Prevent dialog from being closed - ignore any attempt to close it
    if (!open) {
      // Do nothing - effectively preventing the dialog from closing
      return;
    }
  }}>
      <DialogContent 
        className="sm:max-w-md absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-h-[90vh] overflow-auto"
        onPointerDownOutside={e => {
          // Prevent closing by clicking outside
          e.preventDefault();
        }} 
        onEscapeKeyDown={e => {
          // Prevent closing by pressing escape
          e.preventDefault();
        }}
        // Now we can use the hideCloseButton prop
        hideCloseButton={true}
      >
        {/* Custom X button that appears but doesn't actually close the dialog */}
        <div className="absolute right-4 top-4">
          <Button variant="ghost" size="icon" className="opacity-70 hover:opacity-100" onClick={() => {
          toast({
            title: "Action required",
            description: "You must change your default password before continuing."
          });
        }}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <DialogHeader>
          <DialogTitle>Change Default Password</DialogTitle>
          <DialogDescription>
            You are using the default password. Please change your password to continue.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4">
            <FormField control={form.control} name="password" render={({
            field
          }) => <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <FormField control={form.control} name="confirmPassword" render={({
            field
          }) => <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>} />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </> : "Change Password"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>;
};
export default PasswordChangeDialog;
