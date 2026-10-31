import React, { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Toast } from "@/src/components/Toast";
import { registerToastHost, type GlobalToastPayload } from "@/src/services/globalToast";

/**
 * Hote du toast global (`showToast`). Racine : monte UNE fois dans
 * `app/_layout.tsx`. `modal` : a poser en dernier enfant de chaque `<Modal>`
 * (Android seulement, ne fait rien sur iOS) — cf. `services/globalToast.ts`.
 */
export const GlobalToastHost: React.FC<{ modal?: boolean }> = ({ modal }) => {
  const active = !modal || Platform.OS === "android";
  const [toast, setToast] = useState<GlobalToastPayload | null>(null);
  useEffect(() => (active ? registerToastHost(setToast) : undefined), [active]);
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
