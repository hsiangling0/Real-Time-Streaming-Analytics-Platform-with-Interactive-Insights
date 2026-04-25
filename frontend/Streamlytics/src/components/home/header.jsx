import IngestPublic from "../dashboard/IngestPublic";
import UploadCSV from "../dashboard/uploadCSV";
import { useLocation } from "react-router-dom";

export default function Header({ onRefresh }) {
  const location = useLocation();
  const titles = {
    "/": "Dashboard",
    "/analysis": "AI Analysis",
  };

  const title = titles[location.pathname] || "Streamlytics";
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="font-semibold">{title}</div>

      <div className="flex gap-2">
        <IngestPublic onSuccess={onRefresh} />
        <UploadCSV onSuccess={onRefresh} />
      </div>
    </div>
  );
}
