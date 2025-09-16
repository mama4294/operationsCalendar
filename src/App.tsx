import {
  FluentProvider,
  webLightTheme,
  Toaster,
  useId,
} from "@fluentui/react-components";
import TimelineGrid from "./components/TimelineGrid";
import { useGlobalToast, setGlobalToasterId } from "./utils/toastUtils";
import "./App.css";

function App() {
  const toasterId = useId("app-toaster");
  setGlobalToasterId(toasterId);
  useGlobalToast();
  return (
    <FluentProvider
      theme={webLightTheme}
      style={{ height: "100vh", backgroundColor: "#f5f5f5" }}
    >
      <Toaster toasterId={toasterId} />
      <div
        style={{
          padding: "8px 12px 8px 12px",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          minHeight: "0",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#323130",
            fontSize: "1.3rem",
            lineHeight: 1.2,
            paddingLeft: "12px",
          }}
        >
          Operations Timeline
        </h1>
        <TimelineGrid />
      </div>
    </FluentProvider>
  );
}

export default App;
