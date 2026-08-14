import { extractPeriodDate } from "@/src/features/checkout/utils/periodDate";
import { GroupedContactOverlay } from "./overlays/GroupedContactOverlay";
import { GroupedExpressOverlay } from "./overlays/GroupedExpressOverlay";
import { GroupedLocationOverlay } from "./overlays/GroupedLocationOverlay";
import { GroupedPeriodOverlay } from "./overlays/GroupedPeriodOverlay";
import { GroupedVoiceNoteOverlay } from "./overlays/GroupedVoiceNoteOverlay";
import { Livraison } from "@/src/types";
import React from "react";

/** Overlay ouvert par `DeliveryTab`, ou `null` si aucun. */
export type GroupedDeliveryOverlay =
  "location" | "contact" | "period" | "express" | "voiceNote" | null;

interface CartGroupedDeliveryOverlaysProps {
  open: GroupedDeliveryOverlay;
  onCloseOverlay: () => void;
  delivery: Livraison;
  setDelivery: (d: Livraison) => void;
  /** Créneaux de la boutique de référence (`GET /fastfood/:id`). */
  availableHours: any[];
  orderLeadTime: number;
  advanceDays?: number;
  deliveryOffer: any;
  fastFoodId?: string;
  onError?: (message: string) => void;
  /**
   * Bascule vers l'overlay de note vocale, declenchee depuis le bouton micro de
   * l'overlay du lieu — la tuile dediee a disparu de l'etape « Informations ».
   */
}

/**
 * Les CINQ overlays de la section delivery du sheet de commande (lieu, contact,
 * période, zone express, note vocale), réutilisés tels quels par le sheet de
 * livraison groupée. Regroupés ici pour garder le sheet sous le plafond de
 * taille de fichier (R4) : ils ne sont que du câblage sur `delivery`.
 */
export const CartGroupedDeliveryOverlays: React.FC<
  CartGroupedDeliveryOverlaysProps
> = ({
  open,
  onCloseOverlay,
  delivery,
  setDelivery,
  availableHours,
  orderLeadTime,
  advanceDays,
  deliveryOffer,
  fastFoodId,
  onError,
}) => (
  <>
    {open === "location" && (
      <GroupedLocationOverlay
        onClose={onCloseOverlay}
        address={delivery.address || ""}
        note={delivery.note || ""}
        onSave={(addr, note) =>
          setDelivery({ ...delivery, address: addr, note })
        }
        /* Note vocale enregistree SUR PLACE, dans cette meme card. */
        onVoiceNoteChange={(uri) =>
          setDelivery({ ...delivery, voiceNoteUri: uri || "" })
        }
        hasVoiceNote={!!delivery.voiceNoteUri}
      />
    )}

    {open === "contact" && (
      <GroupedContactOverlay
        onClose={onCloseOverlay}
        phone={delivery.phone || ""}
        onSelectPhone={(ph) => setDelivery({ ...delivery, phone: ph })}
      />
    )}

    {open === "period" && (
      <GroupedPeriodOverlay
        onClose={onCloseOverlay}
        selectedPeriod={delivery.hour || ""}
        onSelectPeriod={(period, prix, bonusCode) =>
          setDelivery({
            ...delivery,
            hour: period,
            date: extractPeriodDate(period) ?? delivery.date,
            prix: prix !== undefined ? prix : delivery.prix,
            bonusCode: bonusCode ?? null,
          })
        }
        availableHours={availableHours}
        orderLeadTime={orderLeadTime}
        advanceDays={advanceDays}
        deliveryOffer={deliveryOffer}
        fastFoodId={fastFoodId}
        onError={onError}
      />
    )}

    {open === "express" && (
      <GroupedExpressOverlay
        onClose={onCloseOverlay}
        selectedLieu={delivery.expressLieu || ""}
        onSelectExpress={(lieu, prix, bonusCode) =>
          setDelivery({
            ...delivery,
            expressLieu: lieu,
            expressPrix: prix !== undefined ? prix : delivery.expressPrix,
            bonusCode: bonusCode ?? null,
          })
        }
        availableHours={availableHours}
        deliveryOffer={deliveryOffer}
        fastFoodId={fastFoodId}
        onError={onError}
      />
    )}

    {open === "voiceNote" && (
      <GroupedVoiceNoteOverlay
        onClose={onCloseOverlay}
        onSave={(uri) => setDelivery({ ...delivery, voiceNoteUri: uri })}
      />
    )}
  </>
);
