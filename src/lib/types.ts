export type UserRole = "user" | "hospital";

export type UserProfile = {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  hospital_id: string | null;
  favorite_hospital_ids?: string[] | null;
  created_at: string;
};

export type HospitalProfile = {
  id: string;
  name: string;
  license_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  emergency_contact: string | null;
  hospital_type: string | null;
  created_at: string;
};

export type Hospital = {
  id: string;
  name: string;
  location: string | null;
};

export type ResourceType =
  | "blood"
  | "icu_bed"
  | "oxygen"
  | "ventilator"
  | "medicine"
  | "doctor";

export type Resource = {
  id: string;
  hospital_id: string;
  type: ResourceType;
  name: string;
  quantity: number;
  available: boolean;
  updated_at: string;
  hospitals?: Hospital | null;
};

export type BookingStatus = "pending" | "approved" | "rejected";

export type Booking = {
  id: string;
  patient_id: string;
  hospital_id: string;
  resource_id: string;
  resource_type: ResourceType;
  quantity: number;
  status: BookingStatus;
  created_at: string;
  hospitals?: { id: string; name: string } | null;
  resources?: { id: string; name: string; type: ResourceType } | null;
};
