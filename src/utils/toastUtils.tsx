import React, { useEffect } from "react";
import { useToastController, Toast, ToastTitle } from "@fluentui/react-components";

let globalToasterId: string | null = null;
let globalDispatchToast: ((content: React.ReactNode, options?: { intent?: "success" | "error" | "warning" | "info" }) => void) | null = null;

export const setGlobalToasterId = (id: string) => {
  globalToasterId = id;
};

export const setGlobalDispatchToast = (dispatch: (content: React.ReactNode, options?: { intent?: "success" | "error" | "warning" | "info" }) => void) => {
  globalDispatchToast = dispatch;
};

export const showErrorToast = (message: string) => {
  if (globalDispatchToast) {
    try {
      globalDispatchToast(
        <Toast>
          <ToastTitle>{message}</ToastTitle>
        </Toast>,
        { intent: "error" }
      );
    } catch (error) {
      console.error("Failed to show toast:", error);
    }
  } else {
    console.error("Toast dispatcher not available:", message);
  }
};

// Hook to set the global dispatcher
export const useGlobalToast = () => {
  const toasterId = globalToasterId;
  if (!toasterId) {
    console.warn("ToasterId not set, skipping toast initialization");
    return;
  }
  const { dispatchToast } = useToastController(toasterId);
  useEffect(() => {
    setGlobalDispatchToast(dispatchToast);
  }, [dispatchToast]);
};