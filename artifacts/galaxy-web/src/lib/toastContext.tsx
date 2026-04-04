import React, { createContext, useContext, useState, useCallback, useRef } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
  icon?: string;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: Toast["type"], icon?: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: Toast["type"] = "info", icon?: string) => {
    const id = idRef.current++;
    setToasts(prev => [...prev, { id, message, type, icon }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  const colors: Record<string, { bg: string; border: string; text: string }> = {
    success: { bg: "rgba(0,230,118,0.12)", border: "rgba(0,230,118,0.35)", text: "#00e676" },
    error: { bg: "rgba(255,100,130,0.12)", border: "rgba(255,100,130,0.35)", text: "#ff6482" },
    info: { bg: "rgba(108,92,231,0.15)", border: "rgba(108,92,231,0.35)", text: "#A29BFE" },
    warning: { bg: "rgba(255,215,0,0.12)", border: "rgba(255,215,0,0.35)", text: "#FFD700" },
  };

  const icons: Record<string, string> = {
    success: "\u2705", error: "\u274C", info: "\u2139\uFE0F", warning: "\u26A0\uFE0F",
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast }}>
      {children}
      <div style={{
        position: "fixed", top: 48, left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, display: "flex", flexDirection: "column", gap: 8,
        maxWidth: 380, width: "90%", pointerEvents: "none",
      }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: colors[t.type].bg,
            border: `1px solid ${colors[t.type].border}`,
            borderRadius: 14, padding: "12px 16px",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", gap: 10,
            animation: "slide-up 0.3s ease, fadeOut 0.3s ease 3s forwards",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            pointerEvents: "auto",
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon || icons[t.type]}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors[t.type].text, lineHeight: 1.4 }}>
              {t.message}
            </span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
