import { motion } from "framer-motion";
import { MapPin, Droplets, Stethoscope, Cpu, MessageCircle, Clock } from "lucide-react";

const features = [
  { icon: MapPin, title: "Location-Based Search", desc: "Automatically detects your location and finds the nearest hospitals", color: "text-primary", bg: "bg-primary/10" },
  { icon: Droplets, title: "Blood Availability", desc: "Real-time blood group availability across all nearby blood banks", color: "text-emergency", bg: "bg-emergency/10" },
  { icon: Stethoscope, title: "Doctor Finder", desc: "Find available specialists by department and hospital", color: "text-accent", bg: "bg-accent/10" },
  { icon: Cpu, title: "Equipment Tracking", desc: "Check ventilator, ICU bed, MRI and other equipment availability", color: "text-primary", bg: "bg-primary/10" },
  { icon: MessageCircle, title: "AI Chatbot", desc: "Ask questions naturally like \"Where can I find A+ blood?\"", color: "text-warning", bg: "bg-warning/10" },
  { icon: Clock, title: "Real-Time Updates", desc: "Live status updates on resource availability and hospital hours", color: "text-accent", bg: "bg-accent/10" },
];

const FeaturesSection = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-3">Key Features</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Everything you need to find the right hospital resource, fast.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="p-6 rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-display font-semibold text-card-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
