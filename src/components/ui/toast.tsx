import React, { createContext, useCallback, useContext, useState } from "react";

interface ToastItem {
  id: string;
  message: string;
  tone?: "default" | "accent" | "danger";
}

interface ToastContextValue {
  toast: (message: string, tone?: "default" | "accent" | "danger") => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {}
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback(
    (message: string, tone: "default" | "accent" | "danger" = "default") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const indicatorColor =
            t.tone === "accent"
              ? "#2D5A3D"
              : t.tone === "danger"
                ? "#8B3A2E"
                : "#6B665D";
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex items-center gap-2.5 rounded-[4px] border border-[#E5E1D8] bg-[#FFFFFF] px-3.5 py-2.5 text-[13px] text-[#1A1815] fade-transition"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: indicatorColor }}
              />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
