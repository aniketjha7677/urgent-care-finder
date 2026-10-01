import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Chrome, Loader2, LogIn, ShieldCheck, Stethoscope } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthShell from "@/components/auth/AuthShell";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/components/ui/sonner";
import type { UserRole } from "@/lib/types";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

const LoginPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const { session, profile, refreshProfile } = useAuth();
  const [activeRole, setActiveRole] = useState<UserRole>("user");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const submitLabel = useMemo(
    () => (activeRole === "hospital" ? "Secure Hospital Login" : "Continue to Dashboard"),
    [activeRole],
  );

  useEffect(() => {
    if (params.role === "hospital" || params.role === "user") {
      setActiveRole(params.role);
    }
  }, [params.role]);

  useEffect(() => {
    if (!session) return;
    if (!profile) {
      refreshProfile();
    }
    const role = profile?.role ?? (session.user.user_metadata?.role as UserRole | undefined) ?? "user";
    navigate(role === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
  }, [session, profile, refreshProfile, navigate]);

  const handleLogin = async (values: LoginValues) => {
    if (!hasSupabaseConfig) {
      localStorage.setItem("medifind_role", activeRole);
      navigate(activeRole === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error || !data.user) {
        const message = error?.message ?? "Unable to sign in";
        setMessage(message);
        toast.error(message);
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

      if (profileError) {
        toast.error(profileError.message);
      }

      const resolvedRole =
        (profileRow?.role as UserRole | null) ??
        (data.user.user_metadata?.role as UserRole | undefined) ??
        activeRole;

      toast.success("Signed in successfully.");
      navigate(resolvedRole === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to sign in";
      setMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      setMessage("Enter your email to receive a reset link.");
      return;
    }

    if (!hasSupabaseConfig) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Check your email for the password reset link.");
    }

    setLoading(false);
  };

  const handleGoogle = async () => {
    if (!hasSupabaseConfig) {
      setMessage("Supabase is not configured yet.");
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Secure access for users and hospitals, powered by Supabase Auth."
    >
      <Tabs value={activeRole} onValueChange={value => setActiveRole(value as UserRole)}>
        <TabsList className="grid w-full grid-cols-2 bg-slate-100">
          <TabsTrigger value="user">User Login</TabsTrigger>
          <TabsTrigger value="hospital">Hospital Login</TabsTrigger>
        </TabsList>

        {(["user", "hospital"] as UserRole[]).map(role => (
          <TabsContent key={role} value={role} className="mt-5">
            <form className="space-y-4" onSubmit={form.handleSubmit(handleLogin)}>
              <div className="space-y-1.5">
                <Label>{role === "hospital" ? "Hospital Email" : "Email"}</Label>
                <Input type="email" placeholder="you@email.com" {...form.register("email")} />
                <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
              </div>
              <div className="space-y-1.5">
                <Label>Password</Label>
                <Input type="password" placeholder="••••••••" {...form.register("password")} />
                <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
              </div>

              {message && <p className="text-xs text-amber-700">{message}</p>}

              <Button
                className="w-full shadow-[0_12px_30px_-20px_rgba(14,116,144,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(14,116,144,0.7)]"
                disabled={loading}
                type="submit"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                {loading ? "Signing in..." : submitLabel}
              </Button>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  className="font-medium text-slate-600 hover:text-sky-700"
                  onClick={handleForgotPassword}
                >
                  Forgot password?
                </button>
                <Link className="font-semibold text-sky-700 hover:text-sky-600" to="/register">
                  Create account
                </Link>
              </div>
            </form>

            <div className="mt-5 space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                onClick={handleGoogle}
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-slate-900">
                  {role === "hospital" ? <Building2 className="h-4 w-4" /> : <Stethoscope className="h-4 w-4" />}
                  {role === "hospital" ? "Hospital admins" : "Patients"} get tailored dashboards after login.
                </div>
                <p className="mt-1 flex items-center gap-2 text-slate-600">
                  <ShieldCheck className="h-3 w-3" />
                  Role-based access control and secure session refresh.
                </p>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {!hasSupabaseConfig && (
        <div className="mt-5 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
          Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable real authentication.
        </div>
      )}
    </AuthShell>
  );
};

export default LoginPage;
