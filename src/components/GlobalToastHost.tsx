import React, { useEffect, useState } from "react";
import { Toast } from "@/src/components/Toast";
import { subscribeToast, type GlobalToastPayload } from "@/src/services/globalToast";

/** Hote unique du toast global (`showToast`). A monter UNE fois, en dernier. */
export const GlobalToastHost: React.FC = () => {
  const [toast, setToast] = useState<GlobalToastPayload | null>(null);
  useEffect(() => subscribeToast(setToast), []);
  if (!toast) return null;
  return (
    <Toast
      key={toast.id}
      message={toast.message}
      type={toast.type}
      duration={toast.duration ?? (toast.type === "error" ? 6000 : 3000)}
      onHide={() => setToast((t) => (t?.id === toast.id ? null : t))}
    />
  );
};
