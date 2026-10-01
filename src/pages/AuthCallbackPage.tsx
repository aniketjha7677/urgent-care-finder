import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

const resolveRole = (value?: string | null): UserRole => (value === "hospital" ? "hospital" : "user");

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finalizing secure sign-in...");

  useEffect(() => {
    const completeLogin = async () => {
      if (!hasSupabaseConfig) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        setMessage(error.message);
        return;
      }

      const activeUser = data.session?.user;
      if (!activeUser) {
        navigate("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", activeUser.id)
        .maybeSingle();

      const role = resolveRole((profile?.role as string | null) ?? (activeUser.user_metadata as { role?: string })?.role);
      navigate(role === "hospital" ? "/dashboard/hospital" : "/dashboard/user");
    };

    completeLogin();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="rounded-2xl border border-border bg-white p-6 shadow-card">
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default AuthCallbackPage;
