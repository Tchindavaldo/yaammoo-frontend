// Capsule DEDIEE de l'etape 4 du parcours groupe (CartGroupedDetailCapsule),
// extraite de CartGroupedDeliverySheet (R4) :
// - fermee des qu'on quitte l'etape 4 ;
// - fermee a la fin d'une transaction (en echec le hook repasse a « total ») ;
// - fermee quand le clavier se referme hors transaction (garde : `autoFocus`
//   demande le clavier au montage, il n'est pas encore visible).
import React from "react";

export const useGroupedDetailCapsule = (step: number, isBusy: boolean, isKeyboardVisible: boolean) => {
  const [detailCapsule, setDetailCapsule] = React.useState(false);

  React.useEffect(() => {
    if (step !== 4) setDetailCapsule(false);
  }, [step]);

  const wasBusy = React.useRef(false);
  React.useEffect(() => {
    if (isBusy) {
      wasBusy.current = true;
      return;
    }
    if (wasBusy.current) {
      wasBusy.current = false;
      setDetailCapsule(false);
    }
  }, [isBusy]);

  const kbWasVisible = React.useRef(false);
  React.useEffect(() => {
    if (!detailCapsule) {
      kbWasVisible.current = false;
      return;
    }
    // Transaction partie : la capsule reste (attente, USSD, succes).
    if (isBusy) return;
    if (isKeyboardVisible) kbWasVisible.current = true;
    else if (kbWasVisible.current) setDetailCapsule(false);
  }, [detailCapsule, isKeyboardVisible, isBusy]);

  return [detailCapsule, setDetailCapsule] as const;
};
