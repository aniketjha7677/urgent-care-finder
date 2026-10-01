import { motion } from "framer-motion";
import { Search, MapPin, Heart, Activity } from "lucide-react";

interface HeroSectionProps {
  onSearchClick: () => void;
}

const HeroSection = ({ onSearchClick }: HeroSectionProps) => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center bg-gradient-hero overflow-hidden">
      {/* Floating medical icons */}
      <motion.div
        className="absolute top-20 left-[10%] text-primary/10"
        animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }}
        transition={{ duration: 6, repeat: Infinity }}
      >
        <Heart className="w-16 h-16" />
      </motion.div>
      <motion.div
        className="absolute bottom-32 right-[15%] text-accent/10"
        animate={{ y: [0, 15, 0], rotate: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
      >
        <Activity className="w-20 h-20" />
      </motion.div>

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <MapPin className="w-4 h-4" />
            Location-based Hospital Resource Finder
          </div>

          <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight mb-6">
            <span className="text-foreground">Smart Hospital</span>
            <br />
            <span className="text-gradient-primary">Resource Finder</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Find nearby hospitals with blood, ICU beds, oxygen, ventilators, doctors, medicines, and vaccines in real time during emergencies.
          </p>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSearchClick}
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-semibold text-lg shadow-elevated hover:opacity-90 transition-opacity"
          >
            <Search className="w-5 h-5" />
            Search Resources Now
          </motion.button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto"
        >
          {[
            { label: "Hospitals", value: "500+" },
            { label: "Blood Banks", value: "200+" },
            { label: "Doctors", value: "2,000+" },
            { label: "Cities", value: "50+" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-display text-foreground">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
