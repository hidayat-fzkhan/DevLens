import { Alert, Snackbar } from "@mui/material";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastSeverity = "success" | "info" | "warning" | "error";

type Toast = {
  id: number;
  message: string;
  severity: ToastSeverity;
};

type ToastContextValue = {
  showToast: (message: string, severity?: ToastSeverity) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = "success") => {
      setToast({ id: Date.now(), message, severity });
    },
    [],
  );

  const handleClose = (_event: unknown, reason?: string) => {
    if (reason === "clickaway") return;
    setToast(null);
  };

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        key={toast?.id}
        open={Boolean(toast)}
        autoHideDuration={3500}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast ? (
          <Alert
            onClose={() => setToast(null)}
            severity={toast.severity}
            variant="filled"
            sx={{ minWidth: 280 }}
          >
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
