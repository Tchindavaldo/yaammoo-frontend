// ============================================================================
// BonusUploadToast — échec d'envoi de preuve, signalé PARTOUT dans l'app
// ----------------------------------------------------------------------------
// L'envoi de la vidéo vit dans `BonusContext`, donc il survit à la fermeture de
// la bottom sheet. Un échec ne peut plus compter sur le toast de la sheet : le
// user est peut-être sur une tout autre page. Ce composant, monté avec le
// provider, affiche l'échec où qu'il soit.
// ============================================================================
import { Toast } from "@/src/components/Toast";
import React from "react";
import { useBonusContext } from "../context/BonusContext";

export const BonusUploadToast: React.FC = () => {
  const {
    uploadFailure,
    clearUploadFailure,
    uploadSuccess,
    clearUploadSuccess,
  } = useBonusContext();

  // L'échec prime : si les deux tombaient ensemble, c'est lui qui doit se voir.
  if (uploadFailure) {
    return (
      <Toast message={uploadFailure} type="error" onHide={clearUploadFailure} />
    );
  }
  if (uploadSuccess) {
    return (
      <Toast
        message={uploadSuccess}
        type="success"
        onHide={clearUploadSuccess}
      />
    );
  }
  return null;
};
