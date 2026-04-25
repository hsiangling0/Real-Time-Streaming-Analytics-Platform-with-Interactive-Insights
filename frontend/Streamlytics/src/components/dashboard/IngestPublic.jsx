import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const API_URL = import.meta.env.VITE_API_URL;

export default function IngestPublic({ onSuccess }) {
  const [open, setOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [source, setSource] = useState("yfinance");

  const handleSubmit = async () => {
    try {
      await fetch(`${API_URL}/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          event_type: "market_data",
          data: {
            symbol,
            source,
          },
        }),
      });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Ingest Market</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader className="p-2">
          <DialogTitle>Ingest Market Data</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Input
            className="mt-[5px]"
            placeholder="Symbol (e.g. AAPL, bitcoin)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />

          <select
            className="border rounded p-2 mt-[5px]"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            <option value="yfinance">yfinance (stocks)</option>
            <option value="coingecko">CoinGecko (crypto)</option>
          </select>

          <Button onClick={handleSubmit} className="mt-[20px]">
            Start Streaming
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
