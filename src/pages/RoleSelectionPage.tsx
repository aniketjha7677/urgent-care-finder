import { Link } from "react-router-dom";
import { Building2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import AuthShell from "@/components/auth/AuthShell";

const RoleSelectionPage = () => {
  return (
    <AuthShell
      title="Choose your access"
      subtitle="Select how you will use Smart Hospital Resource Finder. You can always add team members later."
    >
      <div className="grid gap-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_26px_60px_-38px_rgba(14,116,144,0.5)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-900">Hospital / Admin</p>
              <p className="text-sm text-slate-600">Manage resources, update availability, and track capacity.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-100 text-sky-700 shadow-sm">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <Button
            asChild
            className="mt-5 w-full shadow-[0_12px_30px_-20px_rgba(14,116,144,0.55)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(14,116,144,0.7)]"
          >
            <Link to="/register/hospital">Continue as Hospital</Link>
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_26px_60px_-38px_rgba(37,99,235,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-slate-900">Patient / User</p>
              <p className="text-sm text-slate-600">Search nearby hospitals and save critical resources.</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm">
              <UserRound className="h-5 w-5" />
            </div>
          </div>
          <Button
            asChild
            variant="secondary"
            className="mt-5 w-full border border-slate-200 bg-slate-50 text-slate-900 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-md"
          >
            <Link to="/register/user">Continue as Patient</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-slate-600">
          Already have an account?{" "}
          <Link className="font-semibold text-sky-700 hover:text-sky-600" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
};

export default RoleSelectionPage;
