import { useEffect, useState } from "react";
import Sidebar from "@/components/dashboard/sidebar";
import Header from "@/components/dashboard/header";
import ChartStack from "@/components/dashboard/chartStack";
import DataList from "@/components/dashboard/datalist";

localStorage.setItem("token", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJvcmdfaWQiOiJ0ZXN0X29yZyJ9.SheepxG9aQfMtH4lQss1GXvKaKnMQu8VGHk7pJXzlLY");
export default function Dashboard() {
    const [datalist, setDataList] = useState([]);
    const [activeDatasets, setActiveDatasets] = useState([]);

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

  return (
    <div className="flex h-screen bg-muted/30">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col">

        {/* Header */}
        <Header onRefresh={fetchDatasets}/>

        {/* Content Grid */}
        <div className="flex flex-1 gap-4 p-4">

          {/* Chart Area (70%) */}
          <div className="flex-1 rounded-xl border bg-white p-4 shadow-sm">
            <ChartStack data={activeDatasets}/>
          </div>

          {/* Data Panel (30%) */}
          <div className="w-[320px] rounded-xl border bg-white p-4 shadow-sm">
            <DataList data={datalist} onChange={setActiveDatasets}/>
          </div>

        </div>
      </div>
    </div>
  );
}