import { useOutletContext } from "react-router-dom";
import DataList from "@/components/dashboard/datalist";
import AnalysisPanel from "@/components/analysis/panel";

export default function Analysis() {
  const { datalist, activeDatasets, setActiveDatasets } = useOutletContext();

  return (
    <div className="flex flex-1 gap-4 p-4">
      <div className="flex-1 rounded-xl border bg-white p-4 shadow-sm">
        <AnalysisPanel datasets={activeDatasets} />
      </div>
      <div className="w-[320px] rounded-xl border bg-white p-4 shadow-sm">
        <DataList
          data={datalist}
          activeItems={activeDatasets}
          onChange={setActiveDatasets}
        />
      </div>
    </div>
  );
}
