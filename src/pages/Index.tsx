import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  BellRing,
  ChevronDown,
  Clock,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Siren,
  Stethoscope,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import SearchPanel, { SearchCategory } from "@/components/SearchPanel";
import HospitalCard from "@/components/HospitalCard";
import FeaturesSection from "@/components/FeaturesSection";
import ChatBot from "@/components/ChatBot";
import ThemeToggle, { LandingTheme } from "@/components/ThemeToggle";
import { hospitals, getDistance } from "@/data/hospitals";
import { Hospital } from "@/data/hospitals";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import type { Resource } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";

const USER_LAT = 28.6139;
const USER_LNG = 77.209;

interface SearchResult {
  hospital: Hospital;
  distance: number;
}

type RecentSearch = {
  type: SearchCategory;
  value: string;
  timestamp: string;
};

type SavedHospital = {
  id: string;
  name: string;
  city: string | null;
};

type ResourceUpdate = Resource & {
  hospitals?: { id: string; name: string; city?: string | null } | null;
};

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
};

const Index = () => {
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searchInfo, setSearchInfo] = useState<{ type: string; value: string } | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [savedHospitals, setSavedHospitals] = useState<SavedHospital[]>([]);
  const [resourceUpdates, setResourceUpdates] = useState<ResourceUpdate[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { session, profile, loading: authLoading, logout, isLoggingOut } = useAuth();
  const metadata = session?.user.user_metadata as Record<string, string | undefined> | undefined;
  const recentSearchKey = "medifind_recent_searches";
  const landingThemeKey = "medifind_landing_theme";
  const [landingTheme, setLandingTheme] = useState<LandingTheme>("dark");

  const handleSearchClick = () => {
    searchRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = (category: SearchCategory, query: string) => {
    let filtered: Hospital[] = [];

    switch (category) {
      case "blood":
        filtered = hospitals.filter(h => (h.bloodAvailability[query] || 0) > 0);
        break;
      case "doctor":
        filtered = hospitals.filter(h => h.doctors.some(d => d.specialty === query && d.available));
        break;
      case "equipment":
        filtered = hospitals.filter(h => h.equipment.some(e => e.name === query && e.available > 0));
        break;
      case "medicine":
        filtered = hospitals.filter(h => h.medicines.some(m => m.name === query && m.available));
        break;
      case "vaccine":
        filtered = hospitals.filter(h => h.vaccines.some(v => v.name === query && v.available));
        break;
    }

    const sorted = filtered
      .map(h => ({ hospital: h, distance: getDistance(USER_LAT, USER_LNG, h.lat, h.lng) }))
      .sort((a, b) => a.distance - b.distance);

    setResults(sorted);
    setSearchInfo({ type: category, value: query });

    const entry: RecentSearch = {
      type: category,
      value: query,
      timestamp: new Date().toISOString(),
    };
    const nextSearches = [
      entry,
      ...recentSearches.filter(item => item.type !== category || item.value !== query),
    ].slice(0, 6);
    setRecentSearches(nextSearches);
    localStorage.setItem(recentSearchKey, JSON.stringify(nextSearches));

    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.ok) {
      toast.error(result.message ?? "Unable to sign out. Please try again.");
    } else {
      toast.success("You have been signed out.");
    }
    navigate("/", { replace: true });
  };

  const dashboardRole = profile?.role ?? (metadata?.role as "hospital" | "user" | undefined) ?? "user";
  const dashboardPath = dashboardRole === "hospital" ? "/dashboard/hospital" : "/dashboard/user";

  const displayName =
    profile?.full_name ||
    metadata?.full_name ||
    session?.user.email?.split("@")[0] ||
    "Care team member";
  const displayRole = profile?.role === "hospital" || metadata?.role === "hospital" ? "Hospital Admin" : "Patient";
  const displayCity = profile?.city || metadata?.city || "Not set";
  const displayBloodGroup = metadata?.blood_group || "Not set";
  const avatarUrl = metadata?.avatar_url || metadata?.picture || "";
  const initials = displayName
    .split(" ")
    .map(word => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isAuthenticated = Boolean(session);

  useEffect(() => {
    if (authLoading) return;
    if (!session) return;
    if (!profile) return;
    navigate(profile.role === "hospital" ? "/dashboard/hospital" : "/dashboard/user", { replace: true });
  }, [authLoading, session, profile, navigate]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(landingThemeKey);
    if (storedTheme === "dark" || storedTheme === "light") {
      setLandingTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(landingThemeKey, landingTheme);
  }, [landingTheme]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const stored = localStorage.getItem(recentSearchKey);
    if (stored) {
      setRecentSearches(JSON.parse(stored) as RecentSearch[]);
    }
  }, [isAuthenticated]);

  const favoritesKey = useMemo(() => (profile?.favorite_hospital_ids ?? []).join("|"), [profile?.favorite_hospital_ids]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let isMounted = true;
    setLoadingDashboard(true);

    const loadDashboard = async () => {
      if (!hasSupabaseConfig) {
        if (!isMounted) return;
        setSavedHospitals(
          hospitals.slice(0, 3).map(item => ({ id: item.id, name: item.name, city: item.address })),
        );
        setResourceUpdates(
          hospitals.slice(0, 5).map(item => ({
            id: item.id,
            hospital_id: item.id,
            type: "blood",
            name: "Emergency Supplies",
            quantity: item.bloodAvailability["O+"] ?? 0,
            available: item.emergencyServices,
            updated_at: new Date().toISOString(),
            hospitals: { id: item.id, name: item.name, city: item.address },
          })),
        );
        setActivityFeed([
          {
            id: "local-1",
            title: "Apollo updated B+ stock",
            description: "Blood bank refreshed with 12 units available.",
            timestamp: "Just now",
          },
          {
            id: "local-2",
            title: "ICU bed available nearby",
            description: "City General Hospital updated ICU capacity.",
            timestamp: "12 minutes ago",
          },
        ]);
        setLoadingDashboard(false);
        return;
      }

      try {
        if (profile?.favorite_hospital_ids && profile.favorite_hospital_ids.length > 0) {
          const { data: favorites } = await supabase
            .from("hospitals")
            .select("id, name, city")
            .in("id", profile.favorite_hospital_ids);

          if (isMounted && favorites) {
            setSavedHospitals(favorites as SavedHospital[]);
          }
        } else if (isMounted) {
          setSavedHospitals([]);
        }

        const { data: resources } = await supabase
          .from("resources")
          .select("id, hospital_id, type, name, quantity, available, updated_at, hospitals ( id, name, city )")
          .order("updated_at", { ascending: false })
          .limit(8);

        if (isMounted && resources) {
          setResourceUpdates(resources as ResourceUpdate[]);
          setActivityFeed(
            (resources as ResourceUpdate[]).slice(0, 5).map(item => ({
              id: item.id,
              title: `${item.hospitals?.name ?? "Hospital"} updated ${item.name}`,
              description: `${item.quantity} units marked ${item.available ? "available" : "unavailable"}.`,
              timestamp: new Date(item.updated_at).toLocaleTimeString(),
            })),
          );
        }
      } finally {
        if (isMounted) setLoadingDashboard(false);
      }
    };

    loadDashboard();

    if (!hasSupabaseConfig) return () => {
      isMounted = false;
    };

    const channel = supabase
      .channel("home-resources")
      .on("postgres_changes", { event: "*", schema: "public", table: "resources" }, () => {
        loadDashboard();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, favoritesKey]);

  const analytics = useMemo(() => {
    const nearbyHospitals = hospitals.filter(item => getDistance(USER_LAT, USER_LNG, item.lat, item.lng) < 8).length;
    const totalBloodUnits = hospitals.reduce((total, item) => {
      return total + Object.values(item.bloodAvailability).reduce((sum, units) => sum + units, 0);
    }, 0);
    const totalIcuBeds = hospitals.reduce((total, item) => {
      const beds = item.equipment.find(e => e.name.toLowerCase().includes("icu"));
      return total + (beds?.available ?? 0);
    }, 0);
    const vaccineCenters = hospitals.filter(item => item.vaccines.some(v => v.available)).length;
    const vaccinesAvailable = hospitals.reduce(
      (total, item) => total + item.vaccines.filter(v => v.available).length,
      0,
    );

    const realtimeBlood = resourceUpdates
      .filter(item => item.type === "blood")
      .reduce((sum, item) => sum + item.quantity, 0);
    const realtimeIcu = resourceUpdates
      .filter(item => item.type === "icu_bed")
      .reduce((sum, item) => sum + item.quantity, 0);

    return {
      nearbyHospitals,
      bloodUnits: realtimeBlood > 0 ? realtimeBlood : totalBloodUnits,
      icuBeds: realtimeIcu > 0 ? realtimeIcu : totalIcuBeds,
      vaccineCenters,
      vaccinesAvailable,
      emergencyContacts: 4,
    };
  }, [resourceUpdates]);

  return (
    <div className="min-h-screen bg-background landing-theme" data-theme={landingTheme}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-display font-bold text-lg text-foreground">
            🏥 Smart<span className="text-gradient-primary">Finder</span>
          </span>
          <div className="hidden md:flex items-center gap-4">
            <span className="text-xs text-muted-foreground">Emergency Medical Resource Locator</span>
            <ThemeToggle value={landingTheme} onChange={setLandingTheme} />
            {session ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3 rounded-full border border-border bg-white/70 px-3 py-1.5 shadow-sm">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-xs font-semibold text-slate-700">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="leading-tight">
                    <p className="text-xs font-semibold text-foreground">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{displayRole}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-700">
                      {displayBloodGroup}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                      {displayCity}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition hover:bg-white"
                    >
                      Profile
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Signed in</DropdownMenuLabel>
                    <div className="px-2 pb-2 text-xs text-muted-foreground">
                      {session.user.email}
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to={dashboardPath}>Open dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/role-selection">Register</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 px-4 pb-3 md:hidden">
          <span className="text-xs text-muted-foreground">Emergency Medical Resource Locator</span>
          <ThemeToggle value={landingTheme} onChange={setLandingTheme} />
          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-border bg-white/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl} alt={displayName} />
                    <AvatarFallback className="text-[10px] font-semibold text-slate-700">{initials}</AvatarFallback>
                  </Avatar>
                  {displayName}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{displayRole}</DropdownMenuLabel>
                <div className="px-2 pb-2 text-xs text-muted-foreground">
                  {displayBloodGroup} · {displayCity}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashboardPath}>Open dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Login</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/role-selection">Register</Link>
              </Button>
            </div>
          )}
        </div>
      </nav>

      <div className="pt-14">
        {!session ? (
          <>
            <HeroSection onSearchClick={handleSearchClick} />

            <div ref={searchRef} className="px-4">
              <SearchPanel onSearch={handleSearch} />
            </div>

            {results && (
              <div ref={resultsRef} className="container mx-auto px-4 py-12 max-w-3xl">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-1">
                    {results.length} Hospital{results.length !== 1 ? "s" : ""} Found
                  </h2>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Showing results for <span className="font-semibold text-primary">{searchInfo?.value}</span> near your location
                  </p>

                  {results.length === 0 ? (
                    <div className="text-center py-16 bg-card rounded-2xl border border-border">
                      <p className="text-muted-foreground">No hospitals found with the requested resource. Try a different search.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {results.map((r, i) => (
                        <HospitalCard
                          key={r.hospital.id}
                          hospital={r.hospital}
                          distance={r.distance}
                          highlight={searchInfo || undefined}
                          index={i}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              </div>
            )}

            <FeaturesSection />
          </>
        ) : (
          <div className="bg-gradient-to-b from-sky-50 via-white to-white">
            <section className="container mx-auto px-4 py-10">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.55)]">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-sky-500">Live command</p>
                      <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {displayName}</h1>
                      <p className="text-sm text-slate-600">
                        Your emergency response dashboard is synced and ready.
                      </p>
                    </div>
                    <Badge className="bg-sky-100 text-sky-700">{displayRole}</Badge>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <p className="text-xs font-semibold text-sky-600">Profile snapshot</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">Blood group: {displayBloodGroup}</p>
                      <p className="text-sm text-slate-600">City: {displayCity}</p>
                      <p className="text-xs text-slate-500">Email: {session?.user.email}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-semibold text-slate-500">Emergency quick actions</p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <Button variant="outline" className="justify-start">
                          <Siren className="h-4 w-4" />
                          Call emergency
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <MapPin className="h-4 w-4" />
                          Share location
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <HeartPulse className="h-4 w-4" />
                          Request blood
                        </Button>
                        <Button variant="outline" className="justify-start">
                          <Stethoscope className="h-4 w-4" />
                          Find doctors
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Live activity</p>
                      <BellRing className="h-4 w-4 text-sky-500" />
                    </div>
                    <div className="mt-4 space-y-3">
                      {loadingDashboard ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-4 w-1/2" />
                        </div>
                      ) : (
                        activityFeed.map(item => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                            <p className="text-xs text-slate-600">{item.description}</p>
                            <p className="mt-2 text-[11px] text-slate-500">{item.timestamp}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                    <p className="text-sm font-semibold text-slate-900">Emergency pulse</p>
                    <div className="mt-4 space-y-3 text-sm text-slate-600">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        Response SLA: 6 minutes average
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-amber-500" />
                        Last alert received 14 minutes ago
                      </div>
                      <div className="flex items-center gap-3">
                        <Zap className="h-4 w-4 text-sky-500" />
                        Live sync active across hospitals
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="container mx-auto px-4 pb-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                {[
                  { label: "Nearby hospitals", value: analytics.nearbyHospitals, icon: MapPin },
                  { label: "Available blood units", value: analytics.bloodUnits, icon: HeartPulse },
                  { label: "ICU beds nearby", value: analytics.icuBeds, icon: Activity },
                  { label: "Vaccine centers", value: analytics.vaccineCenters, icon: ShieldCheck },
                  { label: "Vaccines available", value: analytics.vaccinesAvailable, icon: Zap },
                  { label: "Emergency contacts", value: analytics.emergencyContacts, icon: Siren },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{card.label}</p>
                      <card.icon className="h-4 w-4 text-sky-500" />
                    </div>
                    <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
                    <p className="text-xs text-slate-500">Updated live</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="container mx-auto px-4 pb-10">
              <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nearby emergency resources</p>
                      <h2 className="text-2xl font-semibold text-slate-900">Search live inventory</h2>
                      <p className="text-sm text-slate-600">Run a live query for resources in your area.</p>
                    </div>
                    <Button variant="outline" onClick={handleSearchClick}>
                      Jump to search
                    </Button>
                  </div>

                  <div ref={searchRef} className="mt-6">
                    <SearchPanel onSearch={handleSearch} />
                  </div>

                  {results && (
                    <div ref={resultsRef} className="mt-8">
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <h3 className="text-xl font-semibold text-slate-900">
                          {results.length} Hospital{results.length !== 1 ? "s" : ""} Found
                        </h3>
                        <p className="text-sm text-slate-600">
                          Showing results for <span className="font-semibold text-sky-700">{searchInfo?.value}</span>
                        </p>

                        {results.length === 0 ? (
                          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-600">
                            No hospitals found with the requested resource.
                          </div>
                        ) : (
                          <div className="mt-6 space-y-4">
                            {results.map((r, i) => (
                              <HospitalCard
                                key={r.hospital.id}
                                hospital={r.hospital}
                                distance={r.distance}
                                highlight={searchInfo || undefined}
                                index={i}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Saved hospitals</p>
                      <Badge className="bg-sky-100 text-sky-700">{savedHospitals.length}</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      {loadingDashboard ? (
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      ) : savedHospitals.length > 0 ? (
                        savedHospitals.map(item => (
                          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-600">{item.city ?? "City not set"}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-600">No saved hospitals yet. Save one from search results.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-900">Recent searches</p>
                      <Clock className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {recentSearches.length === 0 && (
                        <p className="text-sm text-slate-600">No recent searches yet.</p>
                      )}
                      {recentSearches.map(item => (
                        <Button
                          key={`${item.type}-${item.value}`}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSearch(item.type, item.value)}
                        >
                          {item.value}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="container mx-auto px-4 pb-12">
              <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Live hospital updates</p>
                    <Activity className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {loadingDashboard ? (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                        <Skeleton className="h-4 w-2/5" />
                      </div>
                    ) : resourceUpdates.length > 0 ? (
                      resourceUpdates.map(item => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                            <Badge className={item.available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                              {item.available ? "Available" : "Unavailable"}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-600">
                            {item.hospitals?.name ?? "Hospital"} · {item.quantity} units
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No live updates available.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Emergency quick actions</p>
                    <Siren className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button variant="outline" className="justify-start">
                      <Siren className="h-4 w-4" />
                      Activate alert
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <MapPin className="h-4 w-4" />
                      Find ER nearby
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <HeartPulse className="h-4 w-4" />
                      Request blood unit
                    </Button>
                    <Button variant="outline" className="justify-start">
                      <ShieldCheck className="h-4 w-4" />
                      Report incident
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
          <p>Smart Hospital Resource Finder © {new Date().getFullYear()} · Saving lives with technology</p>
        </footer>
      </div>

      <ChatBot />
    </div>
  );
};

export default Index;
