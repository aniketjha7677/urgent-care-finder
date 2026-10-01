import { motion } from "framer-motion";
import { MapPin, Phone, Clock, Star, Droplets, Stethoscope, Cpu, AlertTriangle, ChevronDown, ChevronUp, User } from "lucide-react";
import { Hospital } from "@/data/hospitals";
import { useState } from "react";

interface HospitalCardProps {
  hospital: Hospital;
  distance: number;
  highlight?: { type: string; value: string };
  index: number;
}

const HospitalCard = ({ hospital, distance, highlight, index }: HospitalCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-card rounded-2xl shadow-card hover:shadow-card-hover transition-shadow border border-border overflow-hidden"
    >
      <div className="p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-display font-bold text-card-foreground">{hospital.name}</h3>
              {hospital.emergencyServices && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emergency/10 text-emergency text-xs font-semibold">
                  <AlertTriangle className="w-3 h-3" /> 24/7
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              {hospital.address}
            </div>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-warning/10 text-warning text-sm font-semibold">
            <Star className="w-3.5 h-3.5 fill-current" />
            {hospital.rating}
          </div>
        </div>

        {/* Quick info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-medium">
            <MapPin className="w-3.5 h-3.5" />
            {distance.toFixed(1)} km away
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> {hospital.phone}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {hospital.openingHours}
          </span>
        </div>

        {/* Highlight section */}
        {highlight && (
          <div className="p-3 rounded-xl bg-gradient-hero border border-primary/10 mb-4">
            {highlight.type === "blood" && (
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-emergency" />
                <span className="font-semibold text-card-foreground">
                  {highlight.value} Blood: {hospital.bloodAvailability[highlight.value]} units available
                </span>
              </div>
            )}
            {highlight.type === "doctor" && (
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-primary" />
                <span className="font-semibold text-card-foreground">
                  {highlight.value} specialist available
                </span>
              </div>
            )}
            {highlight.type === "equipment" && (
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-accent" />
                <span className="font-semibold text-card-foreground">
                  {highlight.value}: {hospital.equipment.find(e => e.name === highlight.value)?.available} available
                </span>
              </div>
            )}
            {highlight.type === "medicine" && (
              <div className="flex items-center gap-2">
                <span className="text-lg">💊</span>
                <span className="font-semibold text-card-foreground">
                  {highlight.value} is in stock
                </span>
              </div>
            )}
            {highlight.type === "vaccine" && (
              <div className="flex items-center gap-2">
                <span className="text-lg">💉</span>
                <span className="font-semibold text-card-foreground">
                  {highlight.value} is available
                </span>
              </div>
            )}
          </div>
        )}

        {/* Expand button */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "View full details"}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="border-t border-border px-5 md:px-6 py-5 space-y-5"
        >
          {/* Lab Incharge */}
          <div>
            <h4 className="text-sm font-display font-semibold text-card-foreground mb-2 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Lab Incharge
            </h4>
            <p className="text-sm text-muted-foreground">
              {hospital.labIncharge.name} · {hospital.labIncharge.contact}
            </p>
          </div>

          {/* Blood */}
          <div>
            <h4 className="text-sm font-display font-semibold text-card-foreground mb-2 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-emergency" /> Blood Availability
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(hospital.bloodAvailability).map(([group, units]) => (
                <span
                  key={group}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    units > 0
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {group}: {units} units
                </span>
              ))}
            </div>
          </div>

          {/* Doctors */}
          <div>
            <h4 className="text-sm font-display font-semibold text-card-foreground mb-2 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-primary" /> Doctors
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {hospital.doctors.map((doc) => (
                <div key={doc.name} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50">
                  <div>
                    <span className="text-sm font-medium text-card-foreground">{doc.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{doc.specialty}</span>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${doc.available ? "bg-success" : "bg-muted-foreground/40"}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <h4 className="text-sm font-display font-semibold text-card-foreground mb-2 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" /> Equipment
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {hospital.equipment.map((eq) => (
                <div key={eq.name} className="p-2.5 rounded-xl bg-muted/50 text-center">
                  <div className="text-sm font-medium text-card-foreground">{eq.name}</div>
                  <div className="text-xs text-muted-foreground">{eq.available}/{eq.total} available</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HospitalCard;
