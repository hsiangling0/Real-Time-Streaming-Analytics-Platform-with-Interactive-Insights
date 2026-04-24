import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

export default function Chart({ dataset }) {
  const [data, setData] = useState([]);
  const formatTick = getTimeFormatter(data);
  const datasetId = dataset?.id;
  useEffect(() => {
    if (!datasetId) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/${datasetId}`);

    ws.onopen = () => console.log("WS OPEN", datasetId);
    ws.onclose = () => console.log("WS CLOSED", datasetId);
    ws.onerror = (e) => console.log("WS ERROR", e);

    ws.onmessage = (event) => {
      const point = JSON.parse(event.data);

      // ✅ normalize data
      const formatted = {
        rawX: point.x, // keep original for tooltip
        y: Number(point.y),
      };

      setData((prev) => [...prev.slice(-50), formatted]);
    };

    return () => ws.close();
  }, [dataset]);

  // ✅ detect + format X axis
  function getTimeFormatter(data) {
    // no data → fallback
    if (!data || data.length < 2) {
      return (v) => v;
    }

    const first = data[0]?.rawX;
    const last = data[data.length - 1]?.rawX;

    // not a date → return identity
    if (isNaN(Date.parse(first)) || isNaN(Date.parse(last))) {
      return (v) => v;
    }

    const diffMs = new Date(last) - new Date(first);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > 7) {
      return (v) => new Date(v).toLocaleDateString();
    } else if (diffDays > 1) {
      return (v) => new Date(v).toLocaleString();
    } else {
      return (v) => new Date(v).toLocaleTimeString();
    }
  }

  return (
    <div className="w-full h-full">
      <div className="text-sm font-medium mb-2">{dataset?.name}</div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />

          <XAxis dataKey="rawX" tickFormatter={formatTick} minTickGap={20} />

          <YAxis />

          <Tooltip
            labelFormatter={(label) => new Date(label).toLocaleString()}
          />

          <Line
            type="monotone"
            dataKey="y"
            strokeWidth={2}
            dot={false}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
