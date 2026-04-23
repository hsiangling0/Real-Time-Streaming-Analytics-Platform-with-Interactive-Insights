import { Button } from "@/components/ui/button";
import {
  IconChartBar,
  IconDashboard,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
export default function Sidebar() {
  return (
    <div className="w-16 lg:w-64 border-r bg-white flex flex-col">
        <div className="font-semibold p-6">
            Streamlytics
        </div>
      {/* Top Nav */}
      <div className="flex flex-col gap-2 p-3">
        <Button variant="ghost" className="justify-start"><IconDashboard size={18} />Dashboard</Button>
        <Button variant="ghost" className="justify-start"><IconChartBar size={18} />Analysis</Button>
        <Button variant="ghost" className="justify-start"><IconUsers size={18} />Team</Button>
        <Button variant="ghost" className="justify-start"><IconSettings size={18} />Setting</Button>
      </div>

      {/* Bottom tenant info */}
      <div className="mt-auto p-3 text-xs text-muted-foreground">
        <div>Org: demo_org</div>
        <div>User: Sylvia</div>
      </div>

    </div>
  );
}