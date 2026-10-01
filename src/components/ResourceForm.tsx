import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResourceType } from "@/lib/types";

const RESOURCE_TYPES: { label: string; value: ResourceType }[] = [
  { label: "Blood", value: "blood" },
  { label: "ICU Beds", value: "icu_bed" },
  { label: "Oxygen Cylinders", value: "oxygen" },
  { label: "Ventilators", value: "ventilator" },
  { label: "Medicines", value: "medicine" },
  { label: "Doctors", value: "doctor" },
];

type ResourceFormValues = {
  type: ResourceType;
  name: string;
  quantity: number;
};

type ResourceFormProps = {
  onAdd: (values: ResourceFormValues) => void;
  onUseOne: (values: ResourceFormValues) => void;
  loading?: boolean;
};

const ResourceForm = ({ onAdd, onUseOne, loading }: ResourceFormProps) => {
  const [type, setType] = useState<ResourceType>("blood");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");

  const parsedQuantity = useMemo(() => {
    const numeric = Number(quantity);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 1;
  }, [quantity]);

  const payload = useMemo(
    () => ({ type, name: name.trim(), quantity: parsedQuantity }),
    [type, name, parsedQuantity],
  );

  const handleAdd = () => {
    if (!payload.name) return;
    onAdd(payload);
  };

  const handleUseOne = () => {
    if (!payload.name) return;
    onUseOne({ ...payload, quantity: 1 });
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-white/80 p-6 shadow-card">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Resource Type</label>
          <Select value={type} onValueChange={value => setType(value as ResourceType)}>
            <SelectTrigger className="border-sky-100 bg-white/70 text-slate-900">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map(item => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Resource Name</label>
          <Input
            placeholder="A+ / Cardiologist / Ventilator"
            value={name}
            onChange={event => setName(event.target.value)}
            className="border-sky-100 bg-white/70 text-slate-900"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Quantity</label>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={event => setQuantity(event.target.value)}
            className="border-sky-100 bg-white/70 text-slate-900"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button onClick={handleAdd} disabled={loading || !payload.name}>
          Add Stock
        </Button>
        <Button variant="secondary" onClick={handleUseOne} disabled={loading || !payload.name}>
          Use 1 Unit
        </Button>
      </div>
    </div>
  );
};

export default ResourceForm;
