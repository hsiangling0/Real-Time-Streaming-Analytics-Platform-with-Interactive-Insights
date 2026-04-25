import Chart from "./chart"
export default function ChartStack({data}) {
  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto pr-2">
      {data.length === 0 && (
        <div className="text-center text-muted-foreground">
          No dataset selected
        </div>
      )}

      {data.map((ds) => (
        <div
          key={ds.id}
          className="border rounded-lg p-3 bg-white shadow-sm flex flex-col gap-4 h-full overflow-y-auto"
        >
          <Chart key={ds.id} dataset={ds}/>
        </div>
      ))}
    </div>
  );
}