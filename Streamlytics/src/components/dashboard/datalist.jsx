import { Button } from "@/components/ui/button";
import { useState } from "react";


export default function DataList({data, onChange}) {
    const [activeItems, setActiveItems] = useState([]);

  const toggle = (item) => {
    let updated;

    const exists = activeItems.find((i) => i.id === item.id);

    if (exists) {
      updated = activeItems.filter((i) => i.id !== item.id);
    } else {
      updated = [...activeItems, item];
    }

    setActiveItems(updated);
    onChange(updated); // ✅ send FULL objects, not just IDs
  };

  const isActive = (id) => {
    return activeItems.some((i) => i.id === id);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="font-semibold">Data Streams</div>

      {/* Empty state */}
      {data.length === 0 && (
        <div className="text-xs text-muted-foreground">
          No datasets yet
        </div>
      )}

      {/* List */}
      {data.map((item) => {
        const active = isActive(item.id);

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-lg border p-3 transition
              ${active ? "bg-muted/50 border-primary" : "bg-white"}
            `}
          >
            {/* Left info */}
            <div className="flex flex-col">
              <div className="text-sm font-medium">
                {item.name}
              </div>

              <div className="text-xs text-muted-foreground">
                {item.type} • {item.source}
              </div>
            </div>

            {/* Toggle */}
            <Button
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => toggle(item)}
            >
              {active ? "On" : "Off"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}