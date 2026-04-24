import { Button } from "@/components/ui/button";

export default function DataList({ data, activeItems, onChange }) {
  const toggle = (item) => {
    let updated;
    const exists = activeItems.find((i) => i.id === item.id);

    if (exists) {
      updated = activeItems.filter((i) => i.id !== item.id);
    } else {
      updated = [...activeItems, item];
    }

    onChange(updated);
  };

  const isActive = (id) => {
    return activeItems.some((i) => i.id === id);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="font-semibold">Data Streams</div>

      {data.length === 0 && (
        <div className="text-xs text-muted-foreground">No datasets yet</div>
      )}

      {data.map((item) => {
        const active = isActive(item.id);

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-lg border p-3 transition
              ${active ? "bg-muted/50 border-primary" : "bg-white"}
            `}
          >
            <div className="flex flex-col">
              <div className="text-sm font-medium">{item.name}</div>

              <div className="text-xs text-muted-foreground">
                {item.type} • {item.source}
              </div>
            </div>

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
