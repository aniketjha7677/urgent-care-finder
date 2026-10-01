import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Loader2, UserRound } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import type { UserRole } from "@/lib/types";

const roleSchema = z.enum(["hospital", "user"]);

const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(7, "Phone number looks too short"),
  city: z.string().min(2, "City is required"),
});

const hospitalSchema = baseSchema.extend({
  hospital_name: z.string().min(2, "Hospital name is required"),
  license_number: z.string().min(4, "License number is required"),
  address: z.string().min(6, "Address is required"),
  emergency_contact: z.string().min(7, "Emergency contact is required"),
  hospital_type: z.string().min(2, "Hospital type is required"),
});

const userSchema = baseSchema.extend({
  full_name: z.string().min(2, "Full name is required"),
  blood_group: z.string().optional(),
});

type HospitalFormValues = z.infer<typeof hospitalSchema>;

type UserFormValues = z.infer<typeof userSchema>;

const hospitalTypes = [
  "General Hospital",
  "Specialty Clinic",
  "Children's Hospital",
  "Trauma Center",
  "Teaching Hospital",
];

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];


const RegisterPage = () => {
  const navigate = useNavigate();
  const params = useParams();
  const roleParam = roleSchema.safeParse(params.role).success ? (params.role as UserRole) : null;
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const isHospital = roleParam === "hospital";
  const icon = isHospital ? <Building2 className="h-5 w-5" /> : <UserRound className="h-5 w-5" />;

  const form = useForm<HospitalFormValues | UserFormValues>({
    resolver: zodResolver(isHospital ? hospitalSchema : userSchema),
    defaultValues: isHospital
      ? {
          hospital_name: "",
          license_number: "",
          email: "",
          password: "",
          phone: "",
          address: "",
          city: "",
          emergency_contact: "",
          hospital_type: hospitalTypes[0],
        }
      : {
          full_name: "",
          email: "",
          password: "",
          phone: "",
          blood_group: "",
          city: "",
        },
  });

  const roleLabel = useMemo(() => (isHospital ? "Hospital / Admin" : "Patient / User"), [isHospital]);

  const handleRegister = async (values: HospitalFormValues | UserFormValues) => {
    if (!roleParam) {
      navigate("/register");
      return;
    }

    if (!hasSupabaseConfig) {
      localStorage.setItem("medifind_role", roleParam);
      navigate(roleParam === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
      return;
    }

    setSubmitting(true);
    setNotice(null);

    try {
      const metadata =
        roleParam === "hospital"
          ? {
              role: "hospital",
              hospital_name: values.hospital_name,
              license_number: values.license_number,
              hospital_phone: values.phone,
              hospital_address: values.address,
              hospital_city: values.city,
              emergency_contact: values.emergency_contact,
              hospital_type: values.hospital_type,
            }
          : {
              role: "user",
              full_name: values.full_name,
              phone: values.phone,
              city: values.city,
              blood_group: values.blood_group ?? null,
            };

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        const message =
          error.message.toLowerCase().includes("already registered")
            ? "This email is already registered. Please sign in."
            : error.message;
        toast.error(message);
        return;
      }

      if (!data.user) {
        toast.error("Signup did not return a user. Please try again.");
        return;
      }

      if (!data.session?.user) {
        setNotice("Check your email to confirm your account. We will finish setup after you sign in.");
        return;
      }


      const { error: userError } = await supabase.from("users").upsert({
        id: data.session.user.id,
        email: values.email,
        role: roleParam,
        full_name: roleParam === "user" ? values.full_name : null,
        phone: values.phone,
        city: values.city,
      });

      if (userError) {
        toast.error(userError.message);
        return;
      }

      if (roleParam === "hospital") {
        const { data: hospitalRecord, error: hospitalError } = await supabase
          .from("hospitals")
          .insert({
            user_id: data.session.user.id,
            name: values.hospital_name,
            license_number: values.license_number,
            email: values.email,
            phone: values.phone,
            address: values.address,
            city: values.city,
            emergency_contact: values.emergency_contact,
            hospital_type: values.hospital_type,
          })
          .select("id")
          .maybeSingle();

        if (hospitalError) {
          toast.error(hospitalError.message);
          return;
        }

        if (hospitalRecord?.id) {
          const { error: updateError } = await supabase
            .from("users")
            .update({ hospital_id: hospitalRecord.id })
            .eq("id", data.session.user.id);

          if (updateError) {
            toast.error(updateError.message);
            return;
          }
        }
      }

      navigate(roleParam === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!roleParam) {
    return (
      <AuthShell title="Choose a role" subtitle="Please select a role to continue registration.">
        <Button className="w-full" asChild>
          <Link to="/register">Go to role selection</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Register as ${roleLabel}`} subtitle="Create your secure access profile in under two minutes.">
      <div className="space-y-5">
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-100 text-blue-700">{icon}</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{roleLabel}</p>
              <p className="text-xs text-slate-600">Role secured by Supabase Auth</p>
            </div>
          </div>
          <Link className="text-xs font-semibold text-sky-700 hover:text-sky-600" to="/register">
            Change
          </Link>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(handleRegister)}>
          {isHospital ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Hospital Name</Label>
                  <Input {...form.register("hospital_name")} placeholder="Smart Hospital Center" />
                  <p className="text-xs text-destructive">{form.formState.errors.hospital_name?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>License Number</Label>
                  <Input {...form.register("license_number")} placeholder="LIC-23945" />
                  <p className="text-xs text-destructive">{form.formState.errors.license_number?.message}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...form.register("email")} placeholder="admin@hospital.org" />
                  <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" {...form.register("password")} placeholder="••••••••" />
                  <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input {...form.register("phone")} placeholder="+1 555 234 880" />
                  <p className="text-xs text-destructive">{form.formState.errors.phone?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Emergency Contact</Label>
                  <Input {...form.register("emergency_contact")} placeholder="+1 555 777 909" />
                  <p className="text-xs text-destructive">{form.formState.errors.emergency_contact?.message}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Hospital Address</Label>
                <Textarea {...form.register("address")} placeholder="1420 Medical Plaza, Floor 2" />
                <p className="text-xs text-destructive">{form.formState.errors.address?.message}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input {...form.register("city")} placeholder="Boston" />
                  <p className="text-xs text-destructive">{form.formState.errors.city?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Hospital Type</Label>
                  <Select
                    defaultValue={hospitalTypes[0]}
                    onValueChange={value => form.setValue("hospital_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitalTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-destructive">{form.formState.errors.hospital_type?.message}</p>
                </div>
              </div>

            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input {...form.register("full_name")} placeholder="Alex Morgan" />
                <p className="text-xs text-destructive">{form.formState.errors.full_name?.message}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" {...form.register("email")} placeholder="alex@email.com" />
                  <p className="text-xs text-destructive">{form.formState.errors.email?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" {...form.register("password")} placeholder="••••••••" />
                  <p className="text-xs text-destructive">{form.formState.errors.password?.message}</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input {...form.register("phone")} placeholder="+1 555 204 911" />
                  <p className="text-xs text-destructive">{form.formState.errors.phone?.message}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input {...form.register("city")} placeholder="San Diego" />
                  <p className="text-xs text-destructive">{form.formState.errors.city?.message}</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Blood Group (optional)</Label>
                <Select
                  onValueChange={value => form.setValue("blood_group", value)}
                  defaultValue={""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    {bloodGroups.map(group => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {notice && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">{notice}</p>}

          <Button
            className="w-full shadow-[0_12px_30px_-20px_rgba(14,116,144,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_rgba(14,116,144,0.7)]"
            disabled={submitting}
            type="submit"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating account
              </span>
            ) : (
              "Create account"
            )}
          </Button>
        </form>

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

export default RegisterPage;
