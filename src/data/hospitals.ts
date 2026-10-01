export interface Hospital {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  openingHours: string;
  labIncharge: { name: string; contact: string };
  bloodAvailability: Record<string, number>;
  doctors: { name: string; specialty: string; available: boolean }[];
  equipment: { name: string; total: number; available: number }[];
  medicines: { name: string; available: boolean }[];
  vaccines: { name: string; available: boolean }[];
  rating: number;
  emergencyServices: boolean;
}

export const hospitals: Hospital[] = [
  {
    id: "1",
    name: "City General Hospital",
    address: "123 Medical Center Blvd, Downtown",
    lat: 28.6139,
    lng: 77.209,
    phone: "+91-11-2345-6789",
    openingHours: "24/7 Emergency | OPD: 8AM - 8PM",
    labIncharge: { name: "Dr. Priya Sharma", contact: "+91-98765-43210" },
    bloodAvailability: { "A+": 12, "A-": 3, "B+": 8, "B-": 2, "O+": 15, "O-": 5, "AB+": 4, "AB-": 1 },
    doctors: [
      { name: "Dr. Rajesh Kumar", specialty: "Cardiology", available: true },
      { name: "Dr. Meena Singh", specialty: "Neurology", available: true },
      { name: "Dr. Anil Gupta", specialty: "Orthopedics", available: false },
      { name: "Dr. Sanya Patel", specialty: "Pediatrics", available: true },
    ],
    equipment: [
      { name: "Ventilator", total: 20, available: 8 },
      { name: "ICU Bed", total: 50, available: 12 },
      { name: "MRI Machine", total: 2, available: 1 },
      { name: "CT Scanner", total: 3, available: 2 },
      { name: "X-Ray Machine", total: 5, available: 4 },
    ],
    medicines: [
      { name: "Paracetamol", available: true },
      { name: "Amoxicillin", available: true },
      { name: "Insulin", available: true },
      { name: "Remdesivir", available: false },
    ],
    vaccines: [
      { name: "Hepatitis B Vaccine", available: true },
      { name: "Tetanus Vaccine", available: true },
      { name: "Polio Vaccine", available: false },
      { name: "Corona Vaccine", available: true },
    ],
    rating: 4.5,
    emergencyServices: true,
  },
  {
    id: "2",
    name: "Apollo Care Hospital",
    address: "456 Health Avenue, Sector 15",
    lat: 28.6229,
    lng: 77.219,
    phone: "+91-11-3456-7890",
    openingHours: "24/7 Emergency | OPD: 9AM - 7PM",
    labIncharge: { name: "Dr. Vikram Reddy", contact: "+91-98765-12345" },
    bloodAvailability: { "A+": 6, "A-": 0, "B+": 10, "B-": 4, "O+": 20, "O-": 2, "AB+": 7, "AB-": 3 },
    doctors: [
      { name: "Dr. Sunita Rao", specialty: "Oncology", available: true },
      { name: "Dr. Arjun Menon", specialty: "Cardiology", available: false },
      { name: "Dr. Kavita Joshi", specialty: "Dermatology", available: true },
    ],
    equipment: [
      { name: "Ventilator", total: 30, available: 15 },
      { name: "ICU Bed", total: 60, available: 5 },
      { name: "MRI Machine", total: 3, available: 2 },
      { name: "CT Scanner", total: 2, available: 1 },
      { name: "Dialysis Machine", total: 10, available: 6 },
    ],
    medicines: [
      { name: "Paracetamol", available: true },
      { name: "Azithromycin", available: true },
      { name: "Remdesivir", available: true },
      { name: "Insulin", available: true },
    ],
    vaccines: [
      { name: "Hepatitis B Vaccine", available: true },
      { name: "Tetanus Vaccine", available: false },
      { name: "Polio Vaccine", available: true },
      { name: "Corona Vaccine", available: true },
    ],
    rating: 4.7,
    emergencyServices: true,
  },
  {
    id: "3",
    name: "Green Valley Medical Center",
    address: "789 Wellness Road, Green Park",
    lat: 28.605,
    lng: 77.199,
    phone: "+91-11-4567-8901",
    openingHours: "OPD: 8AM - 10PM | Emergency: Limited",
    labIncharge: { name: "Mr. Rahul Verma", contact: "+91-97654-32100" },
    bloodAvailability: { "A+": 4, "A-": 1, "B+": 3, "B-": 0, "O+": 8, "O-": 0, "AB+": 2, "AB-": 0 },
    doctors: [
      { name: "Dr. Nidhi Kapoor", specialty: "General Medicine", available: true },
      { name: "Dr. Ramesh Iyer", specialty: "ENT", available: true },
    ],
    equipment: [
      { name: "Ventilator", total: 5, available: 2 },
      { name: "ICU Bed", total: 15, available: 7 },
      { name: "X-Ray Machine", total: 3, available: 3 },
      { name: "Ultrasound", total: 4, available: 3 },
    ],
    medicines: [
      { name: "Paracetamol", available: true },
      { name: "Amoxicillin", available: false },
      { name: "Metformin", available: true },
    ],
    vaccines: [
      { name: "Hepatitis B Vaccine", available: true },
      { name: "Tetanus Vaccine", available: true },
      { name: "Polio Vaccine", available: true },
      { name: "Corona Vaccine", available: false },
    ],
    rating: 4.2,
    emergencyServices: false,
  },
  {
    id: "4",
    name: "Fortis Super Specialty Hospital",
    address: "321 Premium Lane, Civil Lines",
    lat: 28.63,
    lng: 77.215,
    phone: "+91-11-5678-9012",
    openingHours: "24/7 Emergency & OPD",
    labIncharge: { name: "Dr. Ananya Bose", contact: "+91-99876-54321" },
    bloodAvailability: { "A+": 20, "A-": 8, "B+": 15, "B-": 6, "O+": 25, "O-": 10, "AB+": 9, "AB-": 5 },
    doctors: [
      { name: "Dr. Siddharth Malhotra", specialty: "Neurosurgery", available: true },
      { name: "Dr. Pooja Bhatt", specialty: "Cardiology", available: true },
      { name: "Dr. Karan Thakur", specialty: "Orthopedics", available: true },
      { name: "Dr. Ritu Saxena", specialty: "Gynecology", available: false },
      { name: "Dr. Manish Tiwari", specialty: "Pulmonology", available: true },
    ],
    equipment: [
      { name: "Ventilator", total: 40, available: 20 },
      { name: "ICU Bed", total: 80, available: 25 },
      { name: "MRI Machine", total: 4, available: 3 },
      { name: "CT Scanner", total: 4, available: 3 },
      { name: "Dialysis Machine", total: 15, available: 10 },
      { name: "ECMO", total: 3, available: 1 },
    ],
    medicines: [
      { name: "Paracetamol", available: true },
      { name: "Remdesivir", available: true },
      { name: "Insulin", available: true },
      { name: "Tocilizumab", available: true },
    ],
    vaccines: [
      { name: "Hepatitis B Vaccine", available: true },
      { name: "Tetanus Vaccine", available: true },
      { name: "Polio Vaccine", available: true },
      { name: "Corona Vaccine", available: true },
    ],
    rating: 4.8,
    emergencyServices: true,
  },
  {
    id: "5",
    name: "Sunrise Community Hospital",
    address: "567 Sunrise Nagar, East District",
    lat: 28.618,
    lng: 77.225,
    phone: "+91-11-6789-0123",
    openingHours: "OPD: 7AM - 9PM | Emergency: 24/7",
    labIncharge: { name: "Ms. Deepa Nair", contact: "+91-96543-21098" },
    bloodAvailability: { "A+": 2, "A-": 0, "B+": 5, "B-": 1, "O+": 10, "O-": 3, "AB+": 1, "AB-": 0 },
    doctors: [
      { name: "Dr. Amit Chandra", specialty: "General Surgery", available: true },
      { name: "Dr. Fatima Khan", specialty: "Pediatrics", available: true },
      { name: "Dr. Suresh Pillai", specialty: "Internal Medicine", available: false },
    ],
    equipment: [
      { name: "Ventilator", total: 10, available: 4 },
      { name: "ICU Bed", total: 25, available: 10 },
      { name: "X-Ray Machine", total: 2, available: 2 },
      { name: "Ultrasound", total: 3, available: 2 },
    ],
    medicines: [
      { name: "Paracetamol", available: true },
      { name: "Amoxicillin", available: true },
      { name: "Insulin", available: false },
    ],
    vaccines: [
      { name: "Hepatitis B Vaccine", available: true },
      { name: "Tetanus Vaccine", available: false },
      { name: "Polio Vaccine", available: true },
      { name: "Corona Vaccine", available: false },
    ],
    rating: 4.0,
    emergencyServices: true,
  },
];

export const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export const equipmentTypes = [
  "Ventilator", "ICU Bed", "MRI Machine", "CT Scanner",
  "X-Ray Machine", "Ultrasound", "Dialysis Machine", "ECMO",
];

export const specialties = [
  "Cardiology", "Neurology", "Orthopedics", "Pediatrics", "Oncology",
  "Dermatology", "ENT", "General Medicine", "Neurosurgery", "Gynecology",
  "Pulmonology", "General Surgery", "Internal Medicine",
];

export const vaccineTypes = [
  "Hepatitis B Vaccine",
  "Tetanus Vaccine",
  "Polio Vaccine",
  "Corona Vaccine",
];

export function getDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
