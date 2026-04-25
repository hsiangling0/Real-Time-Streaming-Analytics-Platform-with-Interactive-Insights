import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const API_URL = import.meta.env.VITE_API_URL;
export default function AnalysisPanel({ datasets }) {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!question || datasets.length === 0) {
      return alert("Select dataset(s) and enter a question");
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          dataset_ids: datasets.map((d) => d.id),
          question,
        }),
      });

      const data = await res.json();
      const job_id=data.job_id;
      const ws = new WebSocket(`${API_URL.replace("https", "wss")}/ws/analysis/${job_id}`);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        setResult(msg.result);
        setLoading(false);
        ws.close();
  };
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div>
        <div className="text-lg font-semibold">AI Analysis</div>
        <div className="text-sm text-muted-foreground">
          Ask questions about your selected datasets
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {datasets.map((d) => (
          <span key={d.id} className="text-xs px-2 py-1 rounded bg-muted">
            {d.name}
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="e.g. Compare trends between BTC and ETH"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <Button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Run"}
        </Button>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border bg-white p-4">
        {!result && (
          <div className="text-sm text-muted-foreground">
            No analysis yet. Ask a question to get insights.
          </div>
        )}

        {result && <div className="whitespace-pre-wrap text-sm">{result}</div>}
      </div>
    </div>
  );
}
