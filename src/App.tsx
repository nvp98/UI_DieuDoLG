import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, Gauge, Bell } from "lucide-react";
import ThungGangAnalysis from "@/pages/ThungGangAnalysis";
import SoDoVanHanh from "@/pages/SoDoVanHanh";
import NavigationMenu from "@/components/NavigationMenu";
import PlaceholderPage from "@/components/PlaceholderPage";

export default function App() {
  const [currentView, setCurrentView] = useState<
    "analysis" | "dashboard" | "baocao"
  >("analysis");

  // Navigation menu items
  const navigationItems = [
    { id: "analysis", label: "Phân tích thùng gang" },
    {
      id: "dashboard",
      label: "Điều độ vận hành",
      icon: <Gauge className="w-4 h-4" />,
    },
    { id: "baocao", label: "Báo cáo thống kê" },
  ];

  const handleNavigationChange = (itemId: string) => {
    // If clicking on "Điều độ vận hành", open HTML file in new tab
    if (itemId === "dashboard") {
      window.open("/dieu_do_gang.html", "_blank");
      return;
    }
    setCurrentView(itemId as any);
  };

  // Render different views based on currentView
  const renderPageContent = () => {
    switch (currentView) {
      case "dashboard":
        return <SoDoVanHanh />;
      case "analysis":
        return <ThungGangAnalysis />;
      case "baocao":
        return <PlaceholderPage title="Báo cáo thống kê" />;
      default:
        return <SoDoVanHanh />;
    }
  };

  // Always render with navigation menu
  return (
    <div className="min-h-screen bg-white">
      <NavigationMenu
        items={navigationItems}
        activeItem={currentView}
        onItemClick={handleNavigationChange}
        logo={
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#ff8c42] rounded-md flex items-center justify-center">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">
              Dữ liệu vận hành
            </span>
          </div>
        }
        rightActions={
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-[#3d5172] h-8 px-3 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Làm mới
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-[#3d5172] h-8 px-2"
            >
              <Bell className="w-3.5 h-3.5" />
            </Button>
          </div>
        }
      />
      {renderPageContent()}
    </div>
  );
}
