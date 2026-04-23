import IngestPublic from "./IngestPublic";
import UploadCSV from "./uploadCSV";
export default function Header({ onRefresh }) {
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">

      <div className="font-semibold">
        Data Streaming Dashboard
      </div>

      <div className="flex gap-2">
        <IngestPublic onSuccess={onRefresh}/>
        <UploadCSV onSuccess={onRefresh}/>
      </div>

    </div>
  );
}