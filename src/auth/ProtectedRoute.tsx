import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { hasSupabaseConfig } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

const Loader = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

type ProtectedRouteProps = {
  children: JSX.Element;
  allowedRoles?: UserRole[];
};

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader />;

  if (!hasSupabaseConfig) {
    const storedRole = localStorage.getItem("medifind_role") as UserRole | null;
    if (!allowedRoles || (storedRole && allowedRoles.includes(storedRole))) {
      return children;
    }
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  if (!session) {
    return <Navigate to="/" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !profile) {
    return <Loader />;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
    const target = profile.role === "hospital" ? "/dashboard/hospital" : "/dashboard/user";
    return <Navigate to={target} replace />;
  }

  return children;
};

export default ProtectedRoute;
