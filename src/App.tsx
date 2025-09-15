import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import TimelineGrid from "./components/TimelineGrid";
import "./App.css";

function App() {
  return (
    <FluentProvider
      theme={webLightTheme}
      style={{ height: "100vh", backgroundColor: "#f5f5f5" }}
    >
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
