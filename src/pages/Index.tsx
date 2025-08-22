
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  useEffect(() => {
    document.title = "PSU San Carlos Document Management System";
  }, []);

  return <Navigate to="/login" replace />;
};

export default Index;
