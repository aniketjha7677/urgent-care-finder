import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Droplets, Stethoscope, Cpu, Pill, Syringe, MapPin } from "lucide-react";
import { bloodGroups, equipmentTypes, specialties, vaccineTypes } from "@/data/hospitals";

export type SearchCategory = "blood" | "doctor" | "equipment" | "medicine" | "vaccine";

interface SearchPanelProps {
  onSearch: (category: SearchCategory, query: string) => void;
}

const categories = [
  { id: "blood" as const, label: "Blood", icon: Droplets, color: "text-emergency" },
  { id: "doctor" as const, label: "Doctors", icon: Stethoscope, color: "text-primary" },
  { id: "equipment" as const, label: "Equipment", icon: Cpu, color: "text-accent" },
  { id: "medicine" as const, label: "Medicines", icon: Pill, color: "text-warning" },
  { id: "vaccine" as const, label: "Vaccines", icon: Syringe, color: "text-emerald-500" },
];

const SearchPanel = ({ onSearch }: SearchPanelProps) => {
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("blood");
  const [selectedValue, setSelectedValue] = useState("");

  const getOptions = () => {
    switch (activeCategory) {
      case "blood": return bloodGroups;
      case "doctor": return specialties;
      case "equipment": return equipmentTypes;
      case "medicine": return ["Paracetamol", "Amoxicillin", "Insulin", "Remdesivir", "Azithromycin", "Metformin", "Tocilizumab"];
      case "vaccine": return vaccineTypes;
    }
  };

  const handleSearch = () => {
    if (selectedValue) onSearch(activeCategory, selectedValue);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-3xl shadow-card p-6 md:p-8 max-w-3xl mx-auto mt-8 relative z-20"
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <MapPin className="w-4 h-4 text-primary" />
        Using your current location
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => { setActiveCategory(cat.id); setSelectedValue(""); }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground shadow-elevated"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <cat.icon className="w-4 h-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Options grid */}
      <div className="flex flex-wrap gap-2 mb-6">
        {getOptions().map((opt) => (
          <button
            key={opt}
            onClick={() => setSelectedValue(opt)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              selectedValue === opt
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-foreground hover:border-primary/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      {/* Search button */}
      <button
        onClick={handleSearch}
        disabled={!selectedValue}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-primary text-primary-foreground font-display font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-elevated"
      >
        <Search className="w-5 h-5" />
        Find Hospitals with {selectedValue || "..."}
      </button>
    </motion.div>
  );
};

export default SearchPanel;
