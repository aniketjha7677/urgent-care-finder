import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import type { HospitalProfile, UserProfile, UserRole } from "@/lib/types";

type AuthState = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  hospital: HospitalProfile | null;
  loading: boolean;
  authError: string | null;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<{ ok: boolean; message?: string }>;
  isLoggingOut: boolean;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

const mapRole = (value?: string | null): UserRole => (value === "hospital" ? "hospital" : "user");

const buildProfileFromMetadata = (user: User): Partial<UserProfile> => {
  const meta = user.user_metadata as Record<string, string | null | undefined>;
  return {
    id: user.id,
    email: user.email ?? null,
    role: mapRole(meta.role),
    full_name: meta.full_name ?? null,
    phone: meta.phone ?? null,
    city: meta.city ?? null,
    hospital_id: meta.hospital_id ?? null,
  };
};

const buildHospitalFromMetadata = (user: User): Partial<HospitalProfile> => {
  const meta = user.user_metadata as Record<string, string | null | undefined>;
  return {
    name: meta.hospital_name ?? "",
    license_number: meta.license_number ?? null,
    email: user.email ?? null,
    phone: meta.hospital_phone ?? null,
    address: meta.hospital_address ?? null,
    city: meta.hospital_city ?? null,
    emergency_contact: meta.emergency_contact ?? null,
    hospital_type: meta.hospital_type ?? null,
  };
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hospital, setHospital] = useState<HospitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const initRef = useRef(false);
  const authListenerRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange> | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const profilePromiseRef = useRef<Promise<void> | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const applySession = useCallback((nextSession: Session | null) => {
    sessionRef.current = nextSession;
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    setAuthError(null);
  }, []);

  const ensureProfile = useCallback(async (activeUser: User) => {
    if (!hasSupabaseConfig) return;
    if (profilePromiseRef.current) {
      await profilePromiseRef.current;
      return;
    }

    profilePromiseRef.current = (async () => {
      try {
        const { data: existingProfile } = await supabase
          .from("users")
          .select("id, email, role, full_name, phone, city, hospital_id, favorite_hospital_ids, created_at")
          .eq("id", activeUser.id)
          .maybeSingle();

        if (!existingProfile) {
          const draftProfile = buildProfileFromMetadata(activeUser);
          await supabase
            .from("users")
            .insert({
              id: activeUser.id,
              email: activeUser.email,
              role: draftProfile.role ?? "user",
              full_name: draftProfile.full_name,
              phone: draftProfile.phone,
              city: draftProfile.city,
              hospital_id: draftProfile.hospital_id,
            });
        }

        const { data: currentProfile } = await supabase
          .from("users")
          .select("id, email, role, full_name, phone, city, hospital_id, favorite_hospital_ids, created_at")
          .eq("id", activeUser.id)
          .maybeSingle();

        setProfile((currentProfile as UserProfile) ?? null);

        if (currentProfile?.role === "hospital") {
          const { data: existingHospital } = await supabase
            .from("hospitals")
            .select(
              "id, name, license_number, email, phone, address, city, emergency_contact, hospital_type, created_at",
            )
            .eq("user_id", activeUser.id)
            .maybeSingle();

          if (!existingHospital) {
            const draftHospital = buildHospitalFromMetadata(activeUser);
            const { data: createdHospital } = await supabase
              .from("hospitals")
              .insert({
                user_id: activeUser.id,
                name: draftHospital.name ?? "",
                license_number: draftHospital.license_number,
                email: draftHospital.email,
                phone: draftHospital.phone,
                address: draftHospital.address,
                city: draftHospital.city,
                emergency_contact: draftHospital.emergency_contact,
                hospital_type: draftHospital.hospital_type,
              })
              .select(
                "id, name, license_number, email, phone, address, city, emergency_contact, hospital_type, created_at",
              )
              .maybeSingle();

            if (createdHospital) {
              await supabase
                .from("users")
                .update({ hospital_id: createdHospital.id })
                .eq("id", activeUser.id);
              setHospital(createdHospital as HospitalProfile);
            }
          } else {
            setHospital(existingHospital as HospitalProfile);
          }
        } else {
          setHospital(null);
        }
      } catch (error) {
        console.error("Auth profile sync failed", error);
        setProfile(null);
        setHospital(null);
      } finally {
        profilePromiseRef.current = null;
      }
    })();

    await profilePromiseRef.current;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!hasSupabaseConfig || !user) return;
    await ensureProfile(user);
  }, [ensureProfile, user]);

  const clearLocalState = useCallback(() => {
    localStorage.removeItem("medifind_role");
    localStorage.removeItem("medifind_favorites");
    localStorage.removeItem("medifind_hospital_id");
    localStorage.removeItem("medifind_hospital_name");
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    let message: string | undefined;

    try {
      if (hasSupabaseConfig) {
        const { error } = await supabase.auth.signOut();
        if (error) message = error.message;
      }
    } catch (error) {
      message = error instanceof Error ? error.message : "Unable to sign out";
    } finally {
      clearLocalState();
      applySession(null);
      setProfile(null);
      setHospital(null);
      setAuthError(null);
      setIsLoggingOut(false);
    }

    return message ? { ok: false, message } : { ok: true };
  }, [clearLocalState]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    let isMounted = true;

    const init = async () => {
      if (!hasSupabaseConfig) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setAuthError(null);

      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        if (!isMounted) return;
        if (sessionRef.current) return;
        setAuthError("Auth initialization timed out. Please refresh.");
        setLoading(false);
      }, 8000);

      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<null>((resolve) => {
          window.setTimeout(() => resolve(null), 4000);
        });
        const result = (await Promise.race([sessionPromise, timeoutPromise])) as
          | Awaited<ReturnType<typeof supabase.auth.getSession>>
          | null;
        if (!result) {
          setAuthError("Auth initialization timed out. Please refresh.");
          return;
        }

        const { data, error } = result;
        if (!isMounted) return;

        if (error) {
          setAuthError(error.message);
          applySession(null);
          setProfile(null);
          setHospital(null);
          return;
        }

        applySession(data.session ?? null);

        if (data.session?.user) {
          await ensureProfile(data.session.user);
          lastUserIdRef.current = data.session.user.id;
        }
      } catch (error) {
        if (!isMounted) return;
        setAuthError(error instanceof Error ? error.message : "Auth initialization failed");
        applySession(null);
        setProfile(null);
        setHospital(null);
      } finally {
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        if (isMounted) setLoading(false);
      }
    };

    init();

    if (!authListenerRef.current && hasSupabaseConfig) {
      authListenerRef.current = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setAuthError(null);
        applySession(nextSession ?? null);

        if (nextSession?.user) {
          const sameUser = lastUserIdRef.current === nextSession.user.id;
          if (!sameUser || !profile) {
            void ensureProfile(nextSession.user);
          }
          lastUserIdRef.current = nextSession.user.id;
        } else {
          setProfile(null);
          setHospital(null);
          lastUserIdRef.current = null;
        }
      });
    }

    return () => {
      isMounted = false;
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
      authListenerRef.current?.subscription?.unsubscribe();
      authListenerRef.current = null;
    };
  }, [applySession, ensureProfile]);

  useEffect(() => {
    const role = profile?.role ?? (user?.user_metadata?.role as UserRole | undefined) ?? null;
    console.log("Session:", session);
    console.log("Loading:", loading);
    console.log("Role:", role);
  }, [session, loading, profile, user]);

  const value = useMemo(
    () => ({ session, user, profile, hospital, loading, authError, refreshProfile, logout, isLoggingOut }),
    [session, user, profile, hospital, loading, authError, refreshProfile, logout, isLoggingOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
