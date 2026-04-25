import { Outlet } from "react-router-dom";
import Sidebar from "@/components/home/sidebar";
import Header from "@/components/home/header";
import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;
export default function Home() {
  const [datalist, setDataList] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState(() => {
    const saved = localStorage.getItem("activeDatasets");
    return saved ? JSON.parse(saved) : [];
  });
  const fetchDatasets = () => {
    fetch(`${API_URL}/datalist`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then(setDataList)
      .catch(console.error);
  };

  useEffect(() => {
    fetchDatasets();
  }, []);
  useEffect(() => {
    localStorage.setItem("activeDatasets", JSON.stringify(activeDatasets));
  }, [activeDatasets]);

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Header onRefresh={fetchDatasets} />
        <Outlet
          context={{
            datalist,
            activeDatasets,
            setActiveDatasets,
            refresh: fetchDatasets,
          }}
        />
      </div>
    </div>
  );
}
