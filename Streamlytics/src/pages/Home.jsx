import { Outlet } from "react-router-dom";
import Sidebar from "@/components/home/sidebar";
import Header from "@/components/home/header";
import { useEffect, useState } from "react";

localStorage.setItem(
  "token",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOiJ0ZXN0X29yZyJ9.SheepxG9aQfMtH4lQss1GXvKaKnMQu8VGHk7pJXzlLY",
);
export default function Home() {
  const [datalist, setDataList] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState(() => {
    const saved = localStorage.getItem("activeDatasets");
    return saved ? JSON.parse(saved) : [];
  });
  const fetchDatasets = () => {
    fetch("http://localhost:8000/datalist", {
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
