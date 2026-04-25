import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IconChartBar, IconDashboard, IconSettings } from "@tabler/icons-react";
export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };
  const isActive = (path) => location.pathname === path;
  return (
    <div className="w-16 lg:w-64 border-r bg-white flex flex-col">
      <div className="font-semibold p-6">Streamlytics</div>

      <div className="flex flex-col gap-2 p-3">
        <Button
          variant={isActive("/") ? "default" : "ghost"}
          className="justify-start"
          onClick={() => navigate("/")}
        >
          <IconDashboard size={18} />
          Dashboard
        </Button>

        <Button
          variant={isActive("/analysis") ? "default" : "ghost"}
          className="justify-start"
          onClick={() => navigate("/analysis")}
        >
          <IconChartBar size={18} />
          Analysis
        </Button>

        <Button variant="ghost" className="justify-start">
          <IconSettings size={18} />
          Setting
        </Button>
      </div>

      <div className="mt-auto p-3 text-xs text-muted-foreground">
        <div className="text-xs text-muted-foreground mb-2">Org: demo_org</div>

        <div className="text-xs text-muted-foreground mb-3">User: Sylvia</div>

        {/* Logout Button */}
        <Button variant="destructive" className="w-full" onClick={handleLogout}>
          Logout
        </Button>
      </div>
    </div>
  );
}
