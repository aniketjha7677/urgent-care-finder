import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  Droplet,
  HeartPulse,
  Mail,
  Pill,
  ShieldCheck,
  Stethoscope,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import ResourceForm from "@/components/ResourceForm";
import { supabase, hasSupabaseConfig } from "@/lib/supabase";
import { Booking, BookingStatus, Resource, ResourceType } from "@/lib/types";
import { useAuth } from "@/auth/AuthContext";

const resourceLabels: Record<ResourceType, string> = {
  blood: "Blood",
  icu_bed: "ICU Beds",
  oxygen: "Oxygen Cylinders",
  ventilator: "Ventilators",
  medicine: "Medicines",
  doctor: "Doctors",
};

const statsConfig = [
  { key: "icu_bed", label: "ICU Beds", icon: HeartPulse },
  { key: "blood", label: "Blood Units", icon: Droplet },
  { key: "oxygen", label: "Oxygen Cylinders", icon: Activity },
  { key: "ventilator", label: "Ventilators", icon: Wrench },
  { key: "medicine", label: "Medicines Available", icon: Pill },
  { key: "doctor", label: "Doctors Available", icon: Stethoscope },
];

const bookingStatusBadge: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

type ActivityItem = {
  id: string;
  title: string;
  timestamp: string;
};

const HospitalDashboard = () => {
  const navigate = useNavigate();
  const { hospital, profile, logout, isLoggingOut } = useAuth();
  const [hospitalId, setHospitalId] = useState("");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<Record<string, string>>({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  useEffect(() => {
    setHospitalId(hospital?.id ?? "");
  }, [hospital]);

  const addActivity = (title: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setActivity(prev => [{ id, title, timestamp: new Date().toLocaleString() }, ...prev].slice(0, 6));
  };

  const fetchResources = useCallback(async () => {
    if (!hasSupabaseConfig || !hospitalId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("resources")
        .select("id, hospital_id, type, name, quantity, available, updated_at")
        .eq("hospital_id", hospitalId)
        .order("updated_at", { ascending: false });

      if (error) {
        setLoadError(error.message);
        return;
      }

      const rows = (data as Resource[]) || [];
      setResources(rows);
      setActivity(
        rows.slice(0, 5).map(item => ({
          id: item.id,
          title: `${resourceLabels[item.type]} updated: ${item.name} (${item.quantity})`,
          timestamp: new Date(item.updated_at).toLocaleString(),
        })),
      );
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load resources");
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchResources();

    if (!hasSupabaseConfig || !hospitalId) return;
    const channel = supabase
      .channel(`resources-hospital-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resources", filter: `hospital_id=eq.${hospitalId}` },
        () => fetchResources(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchResources, hospitalId]);

  const fetchBookings = useCallback(async () => {
    if (!hasSupabaseConfig || !hospitalId) return;
    setBookingsError(null);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, patient_id, hospital_id, resource_id, resource_type, quantity, status, created_at, resources ( id, name, type )")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false })
        .limit(15);

      if (error) {
        setBookingsError(error.message);
        return;
      }

      setBookings((data as Booking[]) || []);
    } catch (err) {
      setBookingsError(err instanceof Error ? err.message : "Unable to load bookings");
    }
  }, [hospitalId]);

  useEffect(() => {
    fetchBookings();

    if (!hasSupabaseConfig || !hospitalId) return;
    const channel = supabase
      .channel(`bookings-hospital-${hospitalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `hospital_id=eq.${hospitalId}` },
        () => fetchBookings(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBookings, hospitalId]);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => {
      setLoadError("Loading timed out. Please refresh or try again.");
      setLoading(false);
    }, 12000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  const handleAddStock = async (values: { type: ResourceType; name: string; quantity: number }) => {
    if (!hasSupabaseConfig || !hospitalId) {
      toast.error("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const { data: existing, error } = await supabase
        .from("resources")
        .select("id, quantity")
        .eq("hospital_id", hospitalId)
        .eq("type", values.type)
        .eq("name", values.name)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (existing) {
        const { error: updateError } = await supabase
          .from("resources")
          .update({ quantity: existing.quantity + values.quantity, available: true })
          .eq("id", existing.id);
        if (updateError) {
          toast.error(updateError.message);
          return;
        }
      } else {
        const { error: insertError } = await supabase.from("resources").insert({
          hospital_id: hospitalId,
          type: values.type,
          name: values.name,
          quantity: values.quantity,
          available: true,
        });
        if (insertError) {
          toast.error(insertError.message);
          return;
        }
      }

      addActivity(`Added ${values.quantity} ${values.name}`);
      toast.success("Resource updated.");
      await fetchResources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update resource");
    } finally {
      setLoading(false);
    }
  };

  const handleUseOne = async (values: { type: ResourceType; name: string; quantity: number }) => {
    if (!hasSupabaseConfig || !hospitalId) {
      toast.error("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setLoadError(null);

    try {
      const { data: existing, error } = await supabase
        .from("resources")
        .select("id, quantity")
        .eq("hospital_id", hospitalId)
        .eq("type", values.type)
        .eq("name", values.name)
        .maybeSingle();

      if (error) {
        toast.error(error.message);
        return;
      }

      if (existing && existing.quantity > 0) {
        const updatedQuantity = existing.quantity - 1;
        const { error: updateError } = await supabase
          .from("resources")
          .update({ quantity: updatedQuantity, available: updatedQuantity > 0 })
          .eq("id", existing.id);
        if (updateError) {
          toast.error(updateError.message);
          return;
        }
        addActivity(`Used 1 ${values.name}`);
      }

      toast.success("Resource adjusted.");
      await fetchResources();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update resource");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (resource: Resource) => {
    if (!hasSupabaseConfig || !hospitalId) return;
    const { error } = await supabase
      .from("resources")
      .update({ available: !resource.available })
      .eq("id", resource.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    addActivity(`${resource.name} marked ${resource.available ? "unavailable" : "available"}`);
  };

  const handleDelete = async (resource: Resource) => {
    if (!hasSupabaseConfig || !hospitalId) return;
    const { error } = await supabase.from("resources").delete().eq("id", resource.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    addActivity(`${resource.name} removed`);
  };

  const handleSaveQuantity = async (resource: Resource) => {
    if (!hasSupabaseConfig || !hospitalId) return;
    const raw = editingQuantity[resource.id];
    const numeric = Math.max(Number(raw ?? resource.quantity), 0);
    const { error } = await supabase
      .from("resources")
      .update({ quantity: numeric, available: numeric > 0 })
      .eq("id", resource.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingQuantity(prev => {
      const next = { ...prev };
      delete next[resource.id];
      return next;
    });
    addActivity(`${resource.name} quantity updated to ${numeric}`);
  };

  const handleBookingStatus = async (booking: Booking, status: BookingStatus) => {
    if (!hasSupabaseConfig || !hospitalId) return;
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", booking.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Booking ${status}.`);
    await fetchBookings();
  };

  const handleLogout = async () => {
    const result = await logout();
    if (!result.ok) {
      toast.error(result.message ?? "Unable to sign out.");
    } else {
      toast.success("You have been signed out.");
    }
    navigate("/", { replace: true });
  };

  const filteredResources = useMemo(() => {
    return filterType === "all" ? resources : resources.filter(item => item.type === filterType);
  }, [resources, filterType]);

  const stats = useMemo(() => {
    const sumByType = (type: ResourceType) =>
      resources.filter(item => item.type === type).reduce((sum, item) => sum + item.quantity, 0);
    return {
      icu_bed: sumByType("icu_bed"),
      blood: sumByType("blood"),
      oxygen: sumByType("oxygen"),
      ventilator: sumByType("ventilator"),
      medicine: sumByType("medicine"),
      doctor: sumByType("doctor"),
    };
  }, [resources]);

  const recentBookings = useMemo(() => bookings.slice(0, 5), [bookings]);
  const pendingBookings = useMemo(
    () => bookings.filter(item => item.status === "pending"),
    [bookings],
  );
  const approvedBookings = useMemo(
    () => bookings.filter(item => item.status === "approved"),
    [bookings],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-sky-100 text-slate-900">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <header className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-[0_30px_70px_-50px_rgba(37,99,235,0.25)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Hospital dashboard</p>
              <h1 className="text-3xl font-semibold text-slate-900">{hospital?.name ?? "Hospital"}</h1>
              <p className="text-sm text-slate-600">{hospital?.hospital_type ?? "Hospital admin"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-emerald-100 text-emerald-700">LIVE</Badge>
              <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut} className="text-slate-600">
                Logout
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-600" />
              {profile?.email ?? hospital?.email ?? "admin@hospital.org"}
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              Live status syncing to patient dashboards
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {statsConfig.map(card => (
            <div key={card.key} className="rounded-2xl border border-sky-100 bg-white/80 p-4 shadow-lg backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">{card.label}</p>
                <card.icon className="h-4 w-4 text-sky-600" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{stats[card.key as keyof typeof stats]}</p>
              <p className="text-xs text-slate-500">Live total</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resource management</p>
                  <h2 className="text-lg font-semibold text-slate-900">Add, update, and control inventory</h2>
                </div>
              </div>
              <div className="mt-4">
                <ResourceForm onAdd={handleAddStock} onUseOne={handleUseOne} loading={loading} />
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Resource list</p>
                  <h2 className="text-lg font-semibold text-slate-900">Current availability</h2>
                </div>
                <div className="w-full max-w-[220px]">
                  <Select value={filterType} onValueChange={value => setFilterType(value as ResourceType | "all")}>
                    <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
                      <SelectValue placeholder="Filter type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {Object.entries(resourceLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {loadError}
                </div>
              )}

              {!hasSupabaseConfig && (
                <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                  Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable live data.
                </div>
              )}

              <div className="mt-4 overflow-hidden rounded-2xl border border-sky-100">
                <Table>
                  <TableHeader>
                    <TableRow className="border-sky-100">
                      <TableHead className="text-slate-600">Resource</TableHead>
                      <TableHead className="text-slate-600">Quantity</TableHead>
                      <TableHead className="text-slate-600">Status</TableHead>
                      <TableHead className="text-slate-600">Updated</TableHead>
                      <TableHead className="text-right text-slate-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map(resource => (
                      <TableRow key={resource.id} className="border-sky-100">
                        <TableCell>
                          <p className="text-sm font-semibold text-slate-900">{resource.name}</p>
                          <p className="text-xs text-slate-500">{resourceLabels[resource.type]}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              className="h-9 w-24 border-sky-100 bg-white/70 text-slate-900"
                              type="number"
                              min={0}
                              value={editingQuantity[resource.id] ?? resource.quantity.toString()}
                              onChange={event =>
                                setEditingQuantity(prev => ({ ...prev, [resource.id]: event.target.value }))
                              }
                            />
                            <Button size="sm" variant="outline" onClick={() => handleSaveQuantity(resource)}>
                              Save
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={resource.available ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>
                            {resource.available ? "Available" : "Unavailable"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {new Date(resource.updated_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggle(resource)}>
                              {resource.available ? "Mark Unavailable" : "Mark Available"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDelete(resource)}>
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredResources.length === 0 && (
                <div className="mt-4 rounded-2xl border border-sky-100 bg-white/70 p-6 text-center text-sm text-slate-600">
                  No resources match this filter yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live activity</p>
                  <h2 className="text-lg font-semibold text-slate-900">Recent updates</h2>
                </div>
                <Badge className="bg-sky-100 text-sky-700">SYNC</Badge>
              </div>
              <div className="mt-4 space-y-3">
                {activity.map(item => (
                  <div key={item.id} className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="text-xs text-slate-500">{item.timestamp}</p>
                  </div>
                ))}
                {activity.length === 0 && (
                  <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm text-slate-600">
                    No updates yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/80 p-6 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Bookings</p>
                  <h2 className="text-lg font-semibold text-slate-900">Requests overview</h2>
                </div>
                <Badge className="bg-sky-100 text-sky-700">LIVE</Badge>
              </div>

              {bookingsError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  {bookingsError}
                </div>
              )}

              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending requests</p>
                  <div className="mt-2 space-y-3">
                    {pendingBookings.map(item => (
                      <div key={item.id} className="rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {resourceLabels[item.resource_type]} · {item.quantity}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.resources?.name ?? "Resource"} · {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleBookingStatus(item, "approved")}>
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleBookingStatus(item, "rejected")}>
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {pendingBookings.length === 0 && (
                      <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm text-slate-600">
                        No pending requests.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Approved bookings</p>
                  <div className="mt-2 space-y-3">
                    {approvedBookings.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {resourceLabels[item.resource_type]} · {item.quantity}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.resources?.name ?? "Resource"} · {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={bookingStatusBadge[item.status]}>{item.status}</Badge>
                      </div>
                    ))}
                    {approvedBookings.length === 0 && (
                      <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm text-slate-600">
                        No approved bookings yet.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Recent bookings</p>
                  <div className="mt-2 space-y-3">
                    {recentBookings.map(item => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/80 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {resourceLabels[item.resource_type]} · {item.quantity}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.resources?.name ?? "Resource"} · {new Date(item.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge className={bookingStatusBadge[item.status]}>{item.status}</Badge>
                      </div>
                    ))}
                    {recentBookings.length === 0 && (
                      <div className="rounded-2xl border border-sky-100 bg-white/70 p-4 text-sm text-slate-600">
                        No bookings yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HospitalDashboard;
