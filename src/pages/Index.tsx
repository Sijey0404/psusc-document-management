
import { useEffect } from "react";
import { Navigate } from "react-router-dom";

const Index = () => {
  useEffect(() => {
    document.title = "Psu-Document-Management";
  }, []);

  return <Navigate to="/login" replace />;
};

export default Index;
