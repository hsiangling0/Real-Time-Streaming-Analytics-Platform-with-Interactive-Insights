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

export default function UploadCSV({ onSuccess }) {
  const [open, setOpen] =useState(false);
  const [file, setFile] = useState(null);
  const [filePath, setFilePath] = useState("");

  const [columns, setColumns] = useState([]);
  const [numericCols, setNumericCols] = useState([]);
  const [preview, setPreview] = useState([]);
  const [xLabel, setXLabel] = useState("");
  const [yLabel, setYLabel] = useState("");

  const token=localStorage.getItem("token");

  const handleUpload = async () => {
    if (!file) return alert("Please upload a file");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res=await fetch("http://localhost:8000/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const data = await res.json();
      setFilePath(data.file_path);
      setColumns(data.columns);
      setNumericCols(data.numeric_columns);
      setPreview(data.preview);

    } catch (err) {
      console.error(err);
    }
  };
  const handleSubmit = async () => {
    if (!xLabel || !yLabel) {
      return alert("Please select X and Y columns");
    }
    
    try {
      await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: "custom_data",
          data: {
            file_path: filePath,
            nickname:file.name,
            x_label: xLabel,
            y_label: yLabel,
          },
        }),
      });
      setOpen(false);
      onSuccess?.();
      setFile(null);
      setPreview([]);
      setColumns([]);
      setNumericCols([]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Upload CSV
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload CSV Data</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {!preview.length && (
            <>
              <Input
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
              />

              <Button onClick={handleUpload}>
                Upload & Preview
              </Button>
            </>
          )}

          {/* STEP 2: Preview + Select */}
          {preview.length > 0 && (
            <>
              {/* Preview Table */}
              <div className="border rounded-md max-h-50 overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th key={col} className="p-1 text-left">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {columns.map((col) => (
                          <td key={col} className="p-1">
                            {row[col]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column Selectors */}
              <div className="flex gap-3">
                <select
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                  className="border rounded p-2 text-sm"
                >
                  <option value="">Select X</option>
                  {columns.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                  className="border rounded p-2 text-sm"
                >
                  <option value="">Select Y</option>
                  {numericCols.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>

              <Button onClick={handleSubmit}>
                Start Streaming
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}