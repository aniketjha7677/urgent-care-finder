import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm: z.string().min(8, "Confirm your password"),
  })
  .refine(data => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

type ResetValues = z.infer<typeof resetSchema>;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const form = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      password: "",
      confirm: "",
    },
  });

  useEffect(() => {
    const init = async () => {
      if (!hasSupabaseConfig) {
        setReady(true);
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setMessage("Open the password reset link from your email to continue.");
      }
      setReady(true);
    };

    init();
  }, []);

  const handleReset = async (values: ResetValues) => {
    if (!hasSupabaseConfig) {
      navigate("/login");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated. You can now log in.");
    setLoading(false);
  };

  return (
    <AuthShell title="Reset your password" subtitle="Create a new secure password for your account.">
      <div className="space-y-4">
        {!ready ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing reset form...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={form.handleSubmit(handleReset)}>
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input type="password" {...form.register("password")} placeholder="••••••••" />
              <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Password</Label>
              <Input type="password" {...form.register("confirm")} placeholder="••••••••" />
              <p className="text-xs text-destructive">{form.formState.errors.confirm?.message}</p>
            </div>

            {message && <p className="text-xs text-amber-700">{message}</p>}

            <Button
              type="submit"
              className="w-full shadow-[0_12px_30px_-20px_rgba(14,116,144,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(14,116,144,0.7)]"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating
                </span>
              ) : (
                "Update password"
              )}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-slate-600">
          Remembered your password?{" "}
          <Link className="font-semibold text-sky-700 hover:text-sky-600" to="/login">
            Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default ResetPasswordPage;
