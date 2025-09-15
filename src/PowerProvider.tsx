import { initialize } from "@microsoft/power-apps/lib/Lifecycle";
import {
  useEffect,
  ReactNode,
  createContext,
  useContext,
  useState,
} from "react";

interface PowerProviderProps {
  children: ReactNode;
}

interface PowerContextValue {
  ready: boolean;
}
const PowerContext = createContext<PowerContextValue>({ ready: false });
export const usePowerReady = () => useContext(PowerContext).ready;

export default function PowerProvider({ children }: PowerProviderProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initialize();
        console.log("Power Platform SDK initialized successfully");
        setReady(true);
      } catch (error) {
        console.error("Failed to initialize Power Platform SDK:", error);
        setReady(false);
      }
    };

    initApp();
  }, []);

  return (
    <PowerContext.Provider value={{ ready }}>{children}</PowerContext.Provider>
  );
}
