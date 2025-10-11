
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Pencil, Archive, UserPlus, Users, ArchiveRestore, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UserService } from "@/services/userService";

interface User {
  id: string;
  name: string;
  email: string;
  role: boolean;
  department_id: string | null;
  position: string;
  archived?: boolean;
}

interface Department {
  id: string;
  name: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: false,
    position: "INSTRUCTOR",
    department_id: "",
    password: "",
  });

  const fetchUsers = async (archived = false) => {
    try {
      setLoading(true);
      
      // Fetch all users and filter on the client side for now
      const { data, error } = await supabase
        .from("profiles")
        .select("*");

      if (error) throw error;
      
      // Filter users based on archived status
      const filteredUsers = (data || []).filter((user: any) => {
        if (archived) {
          return user.archived === true;
        } else {
          return !user.archived || user.archived === false;
        }
      });
      
      // Sort users alphabetically by name
      const sortedUsers = filteredUsers.sort((a: any, b: any) => 
        a.name.localeCompare(b.name)
      );
      
      setUsers(sortedUsers);
      setFilteredUsers(sortedUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(showArchived);
    if (!showArchived) {
      fetchDepartments();
    }
  }, [showArchived]);

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase.from("departments").select("*");
      if (error) throw error;
      
      // Sort departments to place "Information Technology" first
      const sortedDepartments = [...(data || [])].sort((a, b) => {
        if (a.name === "Information Technology") return -1;
        if (b.name === "Information Technology") return 1;
        return a.name.localeCompare(b.name);
      });
      
      setDepartments(sortedDepartments);
    } catch (error: any) {
      console.error("Error fetching departments:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    if (name === "role") {
      setFormData((prev) => ({ ...prev, [name]: value === "true" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: false,
      position: "INSTRUCTOR",
      department_id: "",
      password: "",
    });
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (departments.find(d => d.id === user.department_id)?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users, departments]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      await UserService.createUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        position: formData.position,
        department_id: formData.department_id || undefined,
        password: formData.password || "psu3du123",
      });

      toast({
        title: "Success",
        description: "User created successfully",
      });
      
      setIsAddDialogOpen(false);
      resetForm();
      fetchUsers(showArchived);
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      position: user.position,
      department_id: user.department_id || "",
      password: "", // We don't fetch the password
    });
    setIsEditDialogOpen(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setFormLoading(true);
    
    try {
      // Only send fields that have changed
      const updateData: any = {};
      if (formData.name !== selectedUser.name) updateData.name = formData.name;
      if (formData.email !== selectedUser.email) updateData.email = formData.email;
      if (formData.role !== selectedUser.role) updateData.role = formData.role;
      if (formData.position !== selectedUser.position) updateData.position = formData.position;
      if (formData.department_id !== selectedUser.department_id) updateData.department_id = formData.department_id || null;
      if (formData.password) updateData.password = formData.password;
      
      await UserService.updateUser(selectedUser.id, updateData);
      
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      
      setIsEditDialogOpen(false);
      fetchUsers(showArchived);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const openArchiveDialog = (user: User) => {
    setSelectedUser(user);
    setIsArchiveDialogOpen(true);
  };

  const handleArchiveUser = async () => {
    if (!selectedUser) return;
    
    try {
      setFormLoading(true);
      
      if (selectedUser.archived) {
        await UserService.unarchiveUser(selectedUser.id);
        toast({
          title: "Success",
          description: "User unarchived successfully",
        });
      } else {
        await UserService.archiveUser(selectedUser.id);
        toast({
          title: "Success",
          description: "User archived successfully",
        });
      }
      
      setIsArchiveDialogOpen(false);
      fetchUsers(showArchived);
    } catch (error: any) {
      console.error("Error archiving user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to archive user",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <AppLayout isAdmin={true}>
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {showArchived ? "Archived Users" : "User Management"}
          </h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowArchived(!showArchived)} 
              className="flex items-center gap-2"
            >
              {showArchived ? (
                <>
                  <Users className="h-4 w-4" />
                  <span>Active Users</span>
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4" />
                  <span>Archived Users</span>
                </>
              )}
            </Button>
            {!showArchived && (
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Add New User</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, position, or department..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 ml-4">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearSearch}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.position}</TableCell>
                    <TableCell>
                      {departments.find((d) => d.id === user.department_id)?.name || "Not assigned"}
                    </TableCell>
                    <TableCell>{user.role ? "Admin" : "Faculty"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!showArchived && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          className={showArchived ? "text-primary hover:bg-primary/10" : "text-warning hover:bg-warning/10"}
                          onClick={() => openArchiveDialog(user)}
                          title={showArchived ? "Unarchive user" : "Archive user"}
                        >
                          {showArchived ? (
                            <ArchiveRestore className="h-4 w-4" />
                          ) : (
                            <Archive className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {searchQuery ? 
                      `No users found matching "${searchQuery}"` : 
                      "No users found"
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account for faculty or admin staff. 
              Faculty accounts will be created with default password: 
              <span className="font-medium"> psu3du123</span>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role.toString()}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger id="role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Admin</SelectItem>
                      <SelectItem value="false">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="position">Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => handleSelectChange("position", value)}
                  >
                    <SelectTrigger id="position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="PROFESSOR">Professor</SelectItem>
                      <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                      <SelectItem value="DEAN">Dean</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => handleSelectChange("department_id", value)}
                >
                  <SelectTrigger id="department">
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
              <div>
                <Label htmlFor="password">Password (Optional)</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Leave empty to use default password"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user account information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={formData.role.toString()}
                    onValueChange={(value) => handleSelectChange("role", value)}
                  >
                    <SelectTrigger id="edit-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Admin</SelectItem>
                      <SelectItem value="false">Faculty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-position">Position</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => handleSelectChange("position", value)}
                  >
                    <SelectTrigger id="edit-position">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTRUCTOR">Instructor</SelectItem>
                      <SelectItem value="PROFESSOR">Professor</SelectItem>
                      <SelectItem value="DEPARTMENT_HEAD">Department Head</SelectItem>
                      <SelectItem value="DEAN">Dean</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Select
                  value={formData.department_id}
                  onValueChange={(value) => handleSelectChange("department_id", value)}
                >
                  <SelectTrigger id="edit-department">
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
              <div>
                <Label htmlFor="edit-password">
                  Password (Leave empty to keep current)
                </Label>
                <Input
                  id="edit-password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive User Dialog */}
      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setIsArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.archived ? "Unarchive User" : "Archive User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.archived 
                ? `This will restore ${selectedUser?.name}'s account and make it active again.`
                : `This will archive ${selectedUser?.name}'s account. The user will no longer be able to access the system, but their data will be preserved.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={selectedUser?.archived ? "bg-primary hover:bg-primary/90" : "bg-primary hover:bg-primary/90"}
              onClick={handleArchiveUser}
              disabled={formLoading}
            >
              {formLoading 
                ? (selectedUser?.archived ? "Unarchiving..." : "Archiving...") 
                : (selectedUser?.archived ? "Unarchive User" : "Archive User")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default UserManagement;
