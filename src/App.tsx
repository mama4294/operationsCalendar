import {
  FluentProvider,
  webLightTheme,
  Toaster,
  useId,
} from "@fluentui/react-components";
import { useState } from "react";
import TimelineGrid from "./components/TimelineGrid";
import FloorPlan from "./components/FloorPlan";
import SidebarNavigation, { PageType } from "./components/SidebarNavigation";
import { useGlobalToast, setGlobalToasterId } from "./utils/toastUtils";
import "./App.css";

function App() {
  const toasterId = useId("app-toaster");
  const [currentPage, setCurrentPage] = useState<PageType>('timeline');
  
  setGlobalToasterId(toasterId);
  useGlobalToast();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'timeline':
        return <TimelineGrid />;
      case 'floorplan':
        return <FloorPlan />;
      default:
        return <TimelineGrid />;
    }
  };

  return (
    <FluentProvider
      theme={webLightTheme}
      style={{ height: "100vh", backgroundColor: "#f5f5f5" }}
    >
      <Toaster toasterId={toasterId} />
      <div
        style={{
          height: "100%",
          display: "flex",
          minHeight: "0",
          boxSizing: "border-box",
        }}
      >
        {/* Sidebar Navigation */}
        <SidebarNavigation 
          currentPage={currentPage} 
          onPageChange={setCurrentPage} 
        />
        
        {/* Main Content Area */}
        <div
          style={{
            flex: 1,
            padding: "8px 12px 8px 12px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            minHeight: "0",
            boxSizing: "border-box",
          }}
        >
          {renderCurrentPage()}
        </div>
      </div>
    </FluentProvider>
  );
}

export default App;
