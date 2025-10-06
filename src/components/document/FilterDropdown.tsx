import { useState, useEffect, ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FilterDropdownProps {
  onFilterChange: (filters: { departmentId?: string; categoryId?: string; semester?: string; deadline?: string }) => void;
}

// Wrap ScrollArea inside SelectContent for scrollable dropdown menus
const ScrollableSelectContent = ({ children }: { children: ReactNode }) => (
  <SelectContent>
    <ScrollArea className="h-64 w-full rounded-md">
      {children}
    </ScrollArea>
  </SelectContent>
);

export const FilterDropdown = ({ onFilterChange }: FilterDropdownProps) => {
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; semester?: string; deadline?: string }[]>([]);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [deadlines, setDeadlines] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [selectedSemester, setSelectedSemester] = useState<string | undefined>(undefined);
  const [selectedDeadline, setSelectedDeadline] = useState<string | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(true);
      try {
        // Fetch departments
        const { data: departmentData, error: deptError } = await supabase
          .from('departments')
          .select('id, name');

        if (deptError) throw deptError;
        if (departmentData) {
          // Sort departments to ensure "Information Technology" is always first
          const sortedDepartments = [...departmentData].sort((a, b) => {
            if (a.name === "Information Technology") return -1;
            if (b.name === "Information Technology") return 1;
            return a.name.localeCompare(b.name);
          });
          
          setDepartments(sortedDepartments);
        }

        // Fetch categories with semester and deadline
        const { data: categoryData, error: catError } = await supabase
          .from('document_categories')
          .select('id, name, semester, deadline');

        if (catError) throw catError;
        if (categoryData) {
          setCategories(categoryData);
          
          // Extract unique semesters and deadlines (year ranges)
          const uniqueSemesters = [...new Set(categoryData.map(cat => cat.semester).filter(Boolean))];
          
          // Extract year ranges from deadline field (e.g., "2025-2026")
          const yearRanges = categoryData
            .map(cat => cat.deadline)
            .filter(Boolean)
            .map(deadline => {
              // Extract year pattern like "2025-2026" or "2025" from deadline string
              const yearMatch = deadline?.match(/(\d{4})(?:-(\d{4}))?/);
              if (yearMatch) {
                return yearMatch[2] ? `${yearMatch[1]}-${yearMatch[2]}` : yearMatch[1];
              }
              return null;
            })
            .filter(Boolean);
          
          const uniqueYears = [...new Set(yearRanges)].sort();
          
          setSemesters(uniqueSemesters as string[]);
          setDeadlines(uniqueYears as string[]);
        }
      } catch (error) {
        console.error("Error fetching filter data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilterData();
  }, []);

  useEffect(() => {
    onFilterChange({
      departmentId: selectedDepartment,
      categoryId: selectedCategory,
      semester: selectedSemester,
      deadline: selectedDeadline,
    });
  }, [selectedDepartment, selectedCategory, selectedSemester, selectedDeadline, onFilterChange]);

  const handleClearFilters = () => {
    setSelectedDepartment(undefined);
    setSelectedCategory(undefined);
    setSelectedSemester(undefined);
    setSelectedDeadline(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1 ml-2"
          aria-label="Filter documents"
        >
          <Filter className="h-4 w-4" />
          <span>Filter</span>
          {(selectedDepartment || selectedCategory || selectedSemester || selectedDeadline) && (
            <span className="flex items-center justify-center w-5 h-5 ml-1 text-xs bg-primary text-primary-foreground rounded-full">
              {(selectedDepartment ? 1 : 0) + (selectedCategory ? 1 : 0) + (selectedSemester ? 1 : 0) + (selectedDeadline ? 1 : 0)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Filter Documents</h3>
            {(selectedDepartment || selectedCategory || selectedSemester || selectedDeadline) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleClearFilters}
              >
                <X className="h-3.5 w-3.5" />
                <span className="text-xs">Clear filters</span>
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="department-filter" className="text-sm font-medium">
                Department
              </label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger id="department-filter" className="w-full">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <ScrollableSelectContent>
                  <SelectItem value="all-departments">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </ScrollableSelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label htmlFor="category-filter" className="text-sm font-medium">
                Category
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-filter" className="w-full">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <ScrollableSelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </ScrollableSelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label htmlFor="semester-filter" className="text-sm font-medium">
                Semester
              </label>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger id="semester-filter" className="w-full">
                  <SelectValue placeholder="Select a semester" />
                </SelectTrigger>
                <ScrollableSelectContent>
                  <SelectItem value="all-semesters">All Semesters</SelectItem>
                  {semesters.map((semester) => (
                    <SelectItem key={semester} value={semester}>
                      {semester}
                    </SelectItem>
                  ))}
                </ScrollableSelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label htmlFor="deadline-filter" className="text-sm font-medium">
                Year
              </label>
              <Select value={selectedDeadline} onValueChange={setSelectedDeadline}>
                <SelectTrigger id="deadline-filter" className="w-full">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <ScrollableSelectContent>
                  <SelectItem value="all-deadlines">All Years</SelectItem>
                  {deadlines.map((deadline) => (
                    <SelectItem key={deadline} value={deadline}>
                      {deadline}
                    </SelectItem>
                  ))}
                </ScrollableSelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
