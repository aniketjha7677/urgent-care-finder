import { motion } from "framer-motion";
import { Activity, ShieldCheck, Stethoscope } from "lucide-react";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  eyebrow?: string;
};

const AuthShell = ({ title, subtitle, children, eyebrow = "Smart Hospital Resource Finder" }: AuthShellProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden bg-gradient-to-br from-sky-700 via-sky-600 to-blue-500 text-white lg:flex">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute bottom-10 right-0 h-64 w-64 rounded-full bg-white/25 blur-3xl" />
          </div>
          <div className="relative z-10 flex h-full flex-col justify-between p-12">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/80">{eyebrow}</p>
                <h1 className="text-3xl font-semibold">Secure Care Access</h1>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-3xl font-semibold leading-tight">
                Connect patients, hospitals, and life-saving resources instantly.
              </p>
              <p className="text-white/80">
                A modern healthcare hub for beds, blood, equipment, and real-time availability.
              </p>
              <div className="flex items-center gap-3 text-sm text-white/80">
                <ShieldCheck className="h-4 w-4" />
                Role-based access, audit-ready security, and privacy-first data handling.
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-white/70">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                Built for critical care teams
              </div>
              <span>24/7 real-time updates</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-50/90 px-6 py-10 backdrop-blur-xl sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md space-y-6 text-slate-900"
          >
            <div className="space-y-2">
              <p className="text-sm font-semibold text-sky-700">{eyebrow}</p>
              <h2 className="text-3xl font-semibold text-slate-900">{title}</h2>
              <p className="text-sm text-slate-600">{subtitle}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-30px_rgba(15,23,42,0.45)] transition-shadow duration-300 hover:shadow-[0_28px_65px_-35px_rgba(15,23,42,0.55)]">
              {children}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
