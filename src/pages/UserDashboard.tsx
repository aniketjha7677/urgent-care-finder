import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  MapPin,
  Pill,
  PhoneCall,
  ShieldCheck,
  Siren,
  Stethoscope,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { Booking, BookingStatus, Resource, ResourceType } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "@/components/ui/sonner";
import { hospitals, getDistance, bloodGroups } from "@/data/hospitals";

type HospitalSummary = {
  id: string;
  name: string;
  city: string | null;
  phone: string | null;
  emergencyContact: string | null;
  updatedAt: string;
  distanceKm: number | null;
  resources: Record<ResourceType, number>;
};
type StatusLevel = "available" | "low" | "full";
type MedicineFilter = "all" | "vaccine" | "medicine";
type MedicineAvailability = "all" | "available";

type MedicineCard = {
  resource: Resource;
  hospitalName: string;
  hospitalCity: string | null;
};

type BookingTarget = {
  hospitalId: string;
  hospitalName: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  maxQuantity: number;
};

const resourceLabels: Record<ResourceType, string> = {
  blood: "Blood Units",
  icu_bed: "ICU Beds",
  oxygen: "Oxygen Cylinders",
  ventilator: "Ventilators",
  medicine: "Medicines",
  doctor: "Doctors Available",
};

const statusBadge: Record<StatusLevel, string> = {
  available: "bg-emerald-100 text-emerald-700",
  low: "bg-amber-100 text-amber-700",
  full: "bg-rose-100 text-rose-700",
};

const bookingStatusBadge: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

const resourceTypesForTotals: ResourceType[] = ["icu_bed", "blood", "oxygen", "ventilator", "medicine", "doctor"];
const bookableTypes: ResourceType[] = ["icu_bed", "blood", "oxygen", "ventilator"];

const defaultCoords = { lat: 28.6139, lng: 77.209 };
const NEARBY_DISTANCE_KM = 8;

const UserDashboard = () => {
  const navigate = useNavigate();
  const { profile, session, logout, isLoggingOut } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState(defaultCoords);
  const [bloodGroup, setBloodGroup] = useState<string>("all");
  const [resourceType, setResourceType] = useState<ResourceType | "all">("all");
  const [cityFilter, setCityFilter] = useState("");
  const [availability, setAvailability] = useState<StatusLevel | "all">("all");
  const [userCity, setUserCity] = useState("");
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingTarget, setBookingTarget] = useState<BookingTarget | null>(null);
  const [bookingQuantity, setBookingQuantity] = useState("1");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [medicineSearch, setMedicineSearch] = useState("");
  const [medicineCategory, setMedicineCategory] = useState<MedicineFilter>("all");
  const [medicineAvailability, setMedicineAvailability] = useState<MedicineAvailability>("all");
  const [medicineNearbyOnly, setMedicineNearbyOnly] = useState(false);
  const [medicineCityFilter, setMedicineCityFilter] = useState("");

  const fetchResources = useCallback(async () => {
    if (!hasSupabaseConfig) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("resources")
        .select("id, hospital_id, type, name, quantity, available, updated_at, hospitals ( id, name, city, phone, emergency_contact )")
        .order("updated_at", { ascending: false });

      if (error) {
        setError(error.message);
        return;
      }

      setResources((data as Resource[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load resources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();

    if (!hasSupabaseConfig) return;
    const channel = supabase
      .channel("patient-resources")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources" },
        () => fetchResources(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResources]);

  const fetchBookings = useCallback(async () => {
    if (!hasSupabaseConfig || !session?.user) return;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, patient_id, hospital_id, resource_id, resource_type, quantity, status, created_at, hospitals ( id, name ), resources ( id, name, type )",
        )
        .eq("patient_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        toast.error(error.message);
        return;
      }

      setBookings((data as Booking[]) || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load bookings");
    }
  }, [session?.user]);

  useEffect(() => {
    fetchBookings();

    if (!hasSupabaseConfig || !session?.user) return;
    const channel = supabase
      .channel(`patient-bookings-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `patient_id=eq.${session.user.id}` },
        () => fetchBookings(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings, session?.user]);

  const handleLogout = async () => {
    const result = await logout();
    if (!result.ok) {
      toast.error(result.message ?? "Unable to sign out.");
    } else {
      toast.success("You have been signed out.");
    }
    navigate("/", { replace: true });
  };

  const handleLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        void resolveCityFromCoords(position.coords.latitude, position.coords.longitude);
      },
      () => undefined,
    );
  };

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      position => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        void resolveCityFromCoords(position.coords.latitude, position.coords.longitude);
      },
      () => undefined,
    );
  }, []);

  const resolveBookableResource = (hospitalId: string, type: ResourceType) => {
    return resources
      .filter(item => item.hospital_id === hospitalId && item.type === type && item.available && item.quantity > 0)
      .sort((a, b) => b.quantity - a.quantity)[0];
  };

  const isVaccineName = (name: string) => name.toLowerCase().includes("vaccine");

  const resolveCityFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`,
      );
      if (!response.ok) return;
      const data = (await response.json()) as {
        city?: string;
        locality?: string;
        principalSubdivision?: string;
      };
      const resolvedCity = data.city || data.locality || data.principalSubdivision;
      if (resolvedCity) setUserCity(resolvedCity);
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (!userCity) {
      const profileCity = profile?.city || (session?.user.user_metadata?.city as string | undefined) || "";
      if (profileCity) setUserCity(profileCity);
    }
  }, [profile?.city, session?.user.user_metadata, userCity]);

  const openMedicineBooking = (resource: Resource) => {
    if (!resource.available || resource.quantity <= 0) {
      toast.error("This medicine is out of stock.");
      return;
    }

    const hospitalRecord = resource.hospitals as { id?: string; name?: string } | null;
    setBookingTarget({
      hospitalId: hospitalRecord?.id ?? resource.hospital_id,
      hospitalName: hospitalRecord?.name ?? "Hospital",
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      maxQuantity: resource.quantity,
    });
    setBookingQuantity("1");
    setBookingOpen(true);
  };

  const openBookingModal = (summary: HospitalSummary, type: ResourceType) => {
    const resource = resolveBookableResource(summary.id, type);
    if (!resource) {
      toast.error("This resource is out of stock.");
      return;
    }

    setBookingTarget({
      hospitalId: summary.id,
      hospitalName: summary.name,
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.type,
      maxQuantity: resource.quantity,
    });
    setBookingQuantity("1");
    setBookingOpen(true);
  };

  const handleConfirmBooking = async () => {
    if (!bookingTarget) return;
    if (!hasSupabaseConfig) {
      toast.error("Supabase is not configured.");
      return;
    }
    if (!session?.user) {
      toast.error("Please sign in to book resources.");
      return;
    }

    const requestedQuantity = Math.max(1, Math.floor(Number(bookingQuantity) || 1));
    const quantity = Math.min(requestedQuantity, bookingTarget.maxQuantity);

    setBookingLoading(true);
    try {
      // Try the RPC function first (atomic, uses security definer)
      const { error: rpcError } = await supabase.rpc("create_booking", {
        p_resource_id: bookingTarget.resourceId,
        p_quantity: quantity,
      });

      if (rpcError) {
        // If the RPC function doesn't exist (404 / schema cache), fall back to direct operations
        const isMissingFunction =
          rpcError.message.includes("schema cache") ||
          rpcError.message.includes("could not find") ||
          rpcError.code === "PGRST202";

        if (isMissingFunction) {
          // Fallback: direct table operations
          const bookResult = await directBooking(
            bookingTarget.resourceId,
            quantity,
            session.user.id,
          );

          if (!bookResult.ok) {
            toast.error(bookResult.message);
            if (bookResult.refreshResources) await fetchResources();
            return;
          }
        } else {
          // Genuine RPC error
          const msg = rpcError.message.toLowerCase();
          if (msg.includes("insufficient quantity") || msg.includes("resource not found")) {
            toast.error("Resource is no longer available.");
          } else if (msg.includes("not authenticated")) {
            toast.error("Please sign in to book resources.");
          } else {
            toast.error(rpcError.message);
          }
          return;
        }
      }

      toast.success("Booking request submitted.");
      setBookingOpen(false);
      await fetchResources();
      await fetchBookings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to place booking");
    } finally {
      setBookingLoading(false);
    }
  };

  /** Fallback booking via direct table ops (when RPC function is not deployed) */
  const directBooking = async (
    resourceId: string,
    quantity: number,
    patientId: string,
  ): Promise<{ ok: boolean; message: string; refreshResources?: boolean }> => {
    // 1. Fetch current resource
    const { data: resource, error: fetchErr } = await supabase
      .from("resources")
      .select("id, hospital_id, type, quantity")
      .eq("id", resourceId)
      .single();

    if (fetchErr || !resource) {
      return { ok: false, message: "Resource not found." };
    }

    if (resource.quantity < quantity) {
      return { ok: false, message: "Insufficient stock. Please reduce quantity or try again.", refreshResources: true };
    }

    // 2. Decrease resource quantity
    const remaining = resource.quantity - quantity;
    const { error: updateErr } = await supabase
      .from("resources")
      .update({ quantity: remaining, available: remaining > 0 })
      .eq("id", resource.id);

    if (updateErr) {
      return { ok: false, message: "Failed to update stock: " + updateErr.message };
    }

    // 3. Insert booking
    const { error: insertErr } = await supabase
      .from("bookings")
      .insert({
        patient_id: patientId,
        hospital_id: resource.hospital_id,
        resource_id: resource.id,
        resource_type: resource.type,
        quantity,
        status: "pending",
      });

    if (insertErr) {
      // Rollback resource quantity
      await supabase
        .from("resources")
        .update({ quantity: resource.quantity, available: true })
        .eq("id", resource.id);
      return { ok: false, message: "Failed to create booking: " + insertErr.message };
    }

    return { ok: true, message: "" };
  };

  const summaries = useMemo<HospitalSummary[]>(() => {
    const grouped = new Map<string, HospitalSummary>();
    resources.forEach(resource => {
      const hospitalRecord = resource.hospitals as
        | { id?: string; name?: string; city?: string | null; phone?: string | null; emergency_contact?: string | null }
        | null;
      const hospitalId = hospitalRecord?.id ?? resource.hospital_id;
      if (!hospitalId) return;
      const existing = grouped.get(hospitalId);
      const updatedAt = existing?.updatedAt ?? resource.updated_at;
      const latestUpdatedAt = new Date(resource.updated_at) > new Date(updatedAt) ? resource.updated_at : updatedAt;
      const baseHospital = hospitals.find(item => item.name === hospitalRecord?.name);
      const distanceKm = baseHospital ? getDistance(coords.lat, coords.lng, baseHospital.lat, baseHospital.lng) : null;

      grouped.set(hospitalId, {
        id: hospitalId,
        name: hospitalRecord?.name ?? "Hospital",
        city: hospitalRecord?.city ?? null,
        phone: hospitalRecord?.phone ?? baseHospital?.phone ?? null,
        emergencyContact: hospitalRecord?.emergency_contact ?? baseHospital?.labIncharge.contact ?? null,
        updatedAt: latestUpdatedAt,
        distanceKm,
        resources: {
          blood: existing?.resources.blood ?? 0,
          icu_bed: existing?.resources.icu_bed ?? 0,
          oxygen: existing?.resources.oxygen ?? 0,
          ventilator: existing?.resources.ventilator ?? 0,
          medicine: existing?.resources.medicine ?? 0,
          doctor: existing?.resources.doctor ?? 0,
          [resource.type]: (existing?.resources[resource.type] ?? 0) + resource.quantity,
        },
      });
    });

    return Array.from(grouped.values());
  }, [resources, coords]);

  const totalCards = useMemo(() => {
    const totals = resourceTypesForTotals.reduce<Record<ResourceType, number>>(
      (acc, key) => {
        acc[key] = 0;
        return acc;
      },
      {} as Record<ResourceType, number>,
    );

    resources.forEach(resource => {
      if (resourceTypesForTotals.includes(resource.type)) {
        totals[resource.type] += resource.quantity;
      }
    });

    return totals;
  }, [resources]);

  const resolveStatus = (summary: HospitalSummary): StatusLevel => {
    const quantity =
      resourceType === "all"
        ? resourceTypesForTotals.reduce((total, key) => total + (summary.resources[key] ?? 0), 0)
        : summary.resources[resourceType];
    if (quantity <= 0) return "full";
    if (quantity <= 3) return "low";
    return "available";
  };

  const filteredSummaries = useMemo(() => {
    return summaries.filter(summary => {
      const matchesCity = cityFilter
        ? summary.city?.toLowerCase().includes(cityFilter.toLowerCase())
        : true;
      const matchesType =
        resourceType === "all" ? true : (summary.resources[resourceType] ?? 0) > 0;
      const matchesAvailability = availability === "all" ? true : resolveStatus(summary) === availability;
      const matchesBlood = bloodGroup !== "all"
        ? resources.some(
            resource =>
              resource.hospital_id === summary.id &&
              resource.type === "blood" &&
              resource.name.toLowerCase() === bloodGroup.toLowerCase(),
          )
        : true;

      return matchesCity && matchesType && matchesAvailability && matchesBlood;
    });
  }, [summaries, cityFilter, resourceType, availability, bloodGroup, resources]);

  const filteredMedicines = useMemo(() => {
    const search = medicineSearch.trim().toLowerCase();
    const cityQuery = medicineCityFilter.trim().toLowerCase();
    const detectedCity = userCity.trim().toLowerCase();
    const mapped = resources
      .filter(resource => resource.type === "medicine")
      .map(resource => {
        const hospitalRecord = resource.hospitals as { name?: string; city?: string | null } | null;
        return {
          resource,
          hospitalName: hospitalRecord?.name ?? "Hospital",
          hospitalCity: hospitalRecord?.city ?? null,
        } satisfies MedicineCard;
      })
      .filter(item => {
        const hospitalCity = (item.hospitalCity ?? "").toLowerCase();
        if (medicineAvailability === "available" && (!item.resource.available || item.resource.quantity <= 0)) return false;
        if (medicineCategory === "vaccine" && !isVaccineName(item.resource.name)) return false;
        if (medicineCategory === "medicine" && isVaccineName(item.resource.name)) return false;
        if (search && !item.resource.name.toLowerCase().includes(search)) return false;
        if (cityQuery && hospitalCity !== cityQuery) return false;
        if (!cityQuery && medicineNearbyOnly) {
          if (!detectedCity) return false;
          return hospitalCity === detectedCity;
        }
        return true;
      });

    return mapped.sort((a, b) => {
      const cityA = (a.hospitalCity ?? "").toLowerCase();
      const cityB = (b.hospitalCity ?? "").toLowerCase();
      if (cityA !== cityB) return cityA.localeCompare(cityB);
      return new Date(b.resource.updated_at).getTime() - new Date(a.resource.updated_at).getTime();
    });
  }, [
    resources,
    medicineSearch,
    medicineCategory,
    medicineAvailability,
    medicineNearbyOnly,
    medicineCityFilter,
    userCity,
  ]);

  const displayName =
    profile?.full_name ||
    (session?.user.user_metadata?.full_name as string | undefined) ||
    session?.user.email?.split("@")[0] ||
    "Patient";
  const displayCity = profile?.city || (session?.user.user_metadata?.city as string | undefined) || "Unknown";

  const formatUpdated = (timestamp: string) => new Date(timestamp).toLocaleString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 text-slate-900">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <header className="flex flex-col gap-6 rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-[0_25px_60px_-40px_rgba(37,99,235,0.25)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-600">Patient dashboard</p>
              <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {displayName}</h1>
              <p className="text-sm text-slate-600">City: {displayCity}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleLocation}
                className="border-sky-200 bg-white/70 text-slate-700"
              >
                <MapPin className="h-4 w-4" />
                Update location
              </Button>
              <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut} className="text-slate-600">
                Logout
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-5">
            {[
              { label: "Find ICU Bed", icon: Activity },
              { label: "Find Blood", icon: HeartPulse },
              { label: "Find Oxygen", icon: Zap },
              { label: "Find Ventilator", icon: Stethoscope },
              { label: "Emergency Call", icon: PhoneCall },
            ].map(action => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto justify-start gap-3 border-sky-100 bg-white/70 py-4 text-left text-slate-700"
              >
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            ))}
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "ICU Beds Available", value: totalCards.icu_bed, icon: Activity },
            { label: "Blood Units", value: totalCards.blood, icon: HeartPulse },
            { label: "Oxygen Cylinders", value: totalCards.oxygen, icon: Zap },
            { label: "Ventilators", value: totalCards.ventilator, icon: Stethoscope },
            { label: "Medicines Available", value: totalCards.medicine, icon: Pill },
            { label: "Doctors Available", value: totalCards.doctor, icon: ShieldCheck },
          ].map(card => (
            <div key={card.label} className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{card.label}</p>
                <card.icon className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500">Live totals</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Search & filters</p>
              <h2 className="text-lg font-semibold text-slate-900">Refine nearby resources</h2>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Blood group</label>
              <Select value={bloodGroup} onValueChange={setBloodGroup}>
                <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {bloodGroups.map(group => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resource type</label>
              <Select value={resourceType} onValueChange={value => setResourceType(value as ResourceType | "all")}>
                <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {resourceTypesForTotals.map(type => (
                    <SelectItem key={type} value={type}>
                      {resourceLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">City</label>
              <Input
                value={cityFilter}
                onChange={event => setCityFilter(event.target.value)}
                placeholder="Search city"
                className="border-sky-100 bg-white/70 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Availability</label>
              <Select value={availability} onValueChange={value => setAvailability(value as StatusLevel | "all")}>
                <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="full">Full</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Available medicines & vaccines</p>
              <h2 className="text-lg font-semibold text-slate-900">Choose a medicine before booking</h2>
            </div>
            {loading && <p className="text-xs text-slate-500">Updating...</p>}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Search name</label>
              <Input
                value={medicineSearch}
                onChange={event => setMedicineSearch(event.target.value)}
                placeholder="Search medicines or vaccines"
                className="border-sky-100 bg-white/70 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Category</label>
              <Select value={medicineCategory} onValueChange={value => setMedicineCategory(value as MedicineFilter)}>
                <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="vaccine">Vaccines</SelectItem>
                  <SelectItem value="medicine">General medicines</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Availability</label>
              <Select
                value={medicineAvailability}
                onValueChange={value => setMedicineAvailability(value as MedicineAvailability)}
              >
                <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="available">Available only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">City</label>
              <Input
                value={medicineCityFilter}
                onChange={event => setMedicineCityFilter(event.target.value)}
                placeholder={userCity ? `Detected: ${userCity}` : "Search city"}
                className="border-sky-100 bg-white/70 text-slate-900"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Same city hospitals</label>
              <div className="flex items-center justify-between rounded-xl border border-sky-100 bg-white/70 px-3 py-2">
                <span className="text-xs text-slate-600">Match detected city</span>
                <Switch
                  checked={medicineNearbyOnly}
                  onCheckedChange={setMedicineNearbyOnly}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {filteredMedicines.map(item => {
              const isAvailable = item.resource.available && item.resource.quantity > 0;
              return (
                <div key={item.resource.id} className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-lg backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.resource.name}</p>
                      <p className="text-xs text-slate-600">{item.hospitalName}</p>
                      <p className="text-xs text-slate-500">{item.hospitalCity ?? "City not set"}</p>
                    </div>
                    <Badge className={isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                      {isAvailable ? "Available" : "Unavailable"}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span>Available quantity</span>
                      <span className="text-slate-900">{item.resource.quantity}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Last updated</span>
                      <span className="text-slate-600">{formatUpdated(item.resource.updated_at)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-sky-200 bg-white/70 text-slate-700"
                      disabled={!isAvailable}
                      onClick={() => openMedicineBooking(item.resource)}
                    >
                      {isAvailable ? "Book Now" : "Out of Stock"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && filteredMedicines.length === 0 && (
            <div className="mt-4 rounded-2xl border border-sky-100 bg-white/70 p-6 text-center text-sm text-slate-600">
              No medicines match your filters yet.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Nearby hospitals</p>
              <h2 className="text-lg font-semibold text-slate-900">Realtime availability</h2>
            </div>
            {loading && <p className="text-xs text-slate-500">Updating...</p>}
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          {!hasSupabaseConfig && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
              Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live data.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredSummaries.map(summary => {
              const status = resolveStatus(summary);
              return (
                <div key={summary.id} className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{summary.name}</h3>
                      <p className="text-sm text-slate-600">{summary.city ?? "City not set"}</p>
                      <p className="text-xs text-slate-500">
                        Distance: {summary.distanceKm ? `${summary.distanceKm.toFixed(1)} km` : "N/A"}
                      </p>
                    </div>
                    <Badge className={statusBadge[status]}>
                      {status === "available" ? "Available" : status === "low" ? "Low" : "Full"}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 text-sm">
                    {resourceTypesForTotals.map(type => (
                      <div key={type} className="flex items-center justify-between gap-3">
                        <div className="flex flex-1 items-center justify-between gap-4">
                          <span className="text-slate-600">{resourceLabels[type]}</span>
                          <span className="text-slate-900">{summary.resources[type]}</span>
                        </div>
                        {bookableTypes.includes(type) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-sky-200 bg-white/70 text-slate-700"
                            disabled={summary.resources[type] <= 0}
                            onClick={() => openBookingModal(summary, type)}
                          >
                            {summary.resources[type] <= 0 ? "Out of Stock" : "Book Now"}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Siren className="h-3.5 w-3.5 text-rose-500" />
                      Emergency contact: {summary.emergencyContact ?? summary.phone ?? "Not available"}
                    </div>
                    <div>Last updated: {formatUpdated(summary.updatedAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && filteredSummaries.length === 0 && (
            <div className="rounded-3xl border border-sky-100 bg-white/70 p-10 text-center text-slate-600">
              No hospitals match your filters yet.
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Your bookings</p>
              <h2 className="text-lg font-semibold text-slate-900">Recent requests</h2>
            </div>
            <Badge className="bg-sky-100 text-sky-700">LIVE</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {bookings.map(item => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-white/80 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.hospitals?.name ?? "Hospital"} · {resourceLabels[item.resource_type]}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.resources?.name ?? "Resource"} · Qty {item.quantity} · {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge className={bookingStatusBadge[item.status]}>{item.status}</Badge>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm text-slate-600">
                No bookings yet.
              </div>
            )}
          </div>
        </section>
      </div>

      <Dialog
        open={bookingOpen}
        onOpenChange={open => {
          setBookingOpen(open);
          if (!open) setBookingTarget(null);
        }}
      >
        <DialogContent className="border-sky-100 bg-white text-slate-900">
          <DialogHeader>
            <DialogTitle>Confirm booking</DialogTitle>
            <DialogDescription className="text-slate-500">
              Review the details before submitting your request.
            </DialogDescription>
          </DialogHeader>

          {bookingTarget && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Patient</span>
                <span className="text-slate-900">{displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Hospital</span>
                <span className="text-slate-900">{bookingTarget.hospitalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Resource</span>
                <span className="text-slate-900">{resourceLabels[bookingTarget.resourceType]}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Resource name</span>
                <span className="text-slate-900">{bookingTarget.resourceName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Available</span>
                <span className="text-slate-900">{bookingTarget.maxQuantity}</span>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  max={bookingTarget.maxQuantity}
                  value={bookingQuantity}
                  onChange={event => setBookingQuantity(event.target.value)}
                  className="border-sky-100 bg-sky-50 text-slate-900"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingOpen(false)} disabled={bookingLoading}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBooking} disabled={bookingLoading || !bookingTarget}>
              {bookingLoading ? "Booking..." : "Confirm booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDashboard;
