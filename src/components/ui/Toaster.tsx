import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: string;
  kind: ToastKind;
  msg: string;
}

interface ToasterContextType {
  push: (toast: Omit<Toast, "id">) => void;
}

const ToasterContext = createContext<ToasterContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToasterContext);
  if (!ctx) throw new Error("useToast must be used within Toaster");
  return ctx;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Omit<Toast, "id">) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getConfig = (kind: ToastKind) => {
    switch (kind) {
      case "success":
        return {
          icon: CheckCircle,
          color: "from-emerald-500/20 to-emerald-600/20",
          border: "border-emerald-500/30",
          text: "text-emerald-300"
        };
      case "error":
        return {
          icon: XCircle,
          color: "from-red-500/20 to-red-600/20",
          border: "border-red-500/30",
          text: "text-red-300"
        };
      case "info":
        return {
          icon: Info,
          color: "from-sky-500/20 to-sky-600/20",
          border: "border-sky-500/30",
          text: "text-sky-300"
        };
    }
  };

  return (
    <ToasterContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end justify-start gap-3 p-6">
        <AnimatePresence>
          {toasts.map(toast => {
            const config = getConfig(toast.kind);
            const Icon = config.icon;
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, x: 100 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                exit={{ opacity: 0, x: 100 }}
                className={`pointer-events-auto flex items-center gap-3 rounded-xl border ${config.border} bg-gradient-to-r ${config.color} px-4 py-3 backdrop-blur-xl shadow-2xl`}
              >
                <Icon className={`h-5 w-5 ${config.text}`} />
                <span className="text-white">{toast.msg}</span>
                <button
                  onClick={() => dismiss(toast.id)}
                  className="ml-2 text-white/60 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToasterContext.Provider>
  );
}