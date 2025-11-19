const MULTIPLIER = 31;
const MODULO = 100000000;

export const generateDepartmentCode = (departmentId: string): string => {
  if (!departmentId) return "";

  let hash = 7;
  for (let i = 0; i < departmentId.length; i++) {
    hash = (hash * MULTIPLIER + departmentId.charCodeAt(i)) % MODULO;
  }

  const code = Math.abs(hash).toString().padStart(8, "0");
  return code.slice(0, 8);
};

