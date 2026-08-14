import { Livraison } from "@/src/types";
import React from "react";
import { ScrollView } from "react-native";
import { CartDeliverySegmentStep } from "./CartDeliverySegmentStep";
import { styles } from "./CartPaymentSheet.styles";

interface CartGroupedPaymentBodyProps {
  /** Livraison commune en cours de composition. */
  delivery: Livraison;
  setDelivery: (d: Livraison) => void;
  hasExpressZones: boolean;
  /** Nombre total de commandes du lot. */
  cmd: number;
  /** Nombre de livraisons distinctes prevues si l'on ne groupe pas. */
  deliveryCount: number;
  /** Montant des articles (hors livraison). */
  articlesTotal: number;
  /** Frais de la course unique. */
  livraison: number;
  onSplit: () => void;
  onOpenLocation: () => void;
  onOpenContact: () => void;
  onOpenPeriod: () => void;
  onOpenExpress: () => void;
  onOpenVoiceNote: () => void;
  network: "orange" | "mtn";
  onNetworkChange: (network: "orange" | "mtn") => void;
  /** Paiement parti : le choix du reseau est verrouille. */
  isBusy: boolean;
  /**
   * PAGE affichee (1 a 5). Le sheet a une hauteur reduite : la livraison
   * groupee ne tient plus sur un seul ecran, elle se parcourt en cinq temps.
   * 1 = groupage, 2 = type de livraison, 3 = informations, 4 = montants,
   * 5 = recap + paiement.
   */
  step: 1 | 2 | 3 | 4 | 5;
}

/**
 * CORPS de paiement du parcours GROUPE — copie dediee de `CartPaymentBody`
 * (R16 : on duplique, on ne partage pas) dont tout le contenu situe AU-DESSUS du
 * choix du reseau est remplace par l'etape de livraison groupee (groupage, type
 * de livraison, tuiles d'informations et recapitulatif des montants).
 *
 * Le bas — libelle « MOYEN DE PAIEMENT » et cards Orange Money / MTN MoMo — est
 * repris a l'identique de l'original, capsule de saisie comprise (celle-ci reste
 * ancree hors du corps par le sheet hote).
 */
export const CartGroupedPaymentBody: React.FC<CartGroupedPaymentBodyProps> = ({
  delivery,
  setDelivery,
  hasExpressZones,
  cmd,
  deliveryCount,
  articlesTotal,
  livraison,
  onSplit,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
  network,
  onNetworkChange,
  isBusy,
  step,
}) => (
  <ScrollView
    style={styles.scroll}
    contentContainerStyle={styles.scrollContent}
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
    {/* Haut de page : toute l'etape de livraison groupee, a la place des cards
        de mode de reception et du recapitulatif d'origine. Pas de conteneur
        propre — le `scrollContent` porte deja la gouttiere, en ajouter une
        seconde (ou la compenser) collait le contenu aux bords. */}
    <CartDeliverySegmentStep
      delivery={delivery}
      setDelivery={setDelivery}
      hasExpressZones={hasExpressZones}
      /* On est sur le parcours groupe ; « Separees » repasse la main au
         panier, ou chaque zone garde son propre bouton. */
      grouped
      cmd={cmd}
      deliveryCount={deliveryCount}
      articlesTotal={articlesTotal}
      livraison={livraison}
      onGroupAll={() => {}}
      onSplit={onSplit}
      onOpenLocation={onOpenLocation}
      onOpenContact={onOpenContact}
      onOpenPeriod={onOpenPeriod}
      onOpenExpress={onOpenExpress}
      onOpenVoiceNote={onOpenVoiceNote}
      step={step}
      stepCount={5}
      network={network}
      onNetworkChange={onNetworkChange}
      isBusy={isBusy}
      section={
        step === 1
          ? "group"
          : step === 2
            ? "type"
            : step === 3
              ? "infos"
              : step === 4
                ? "montants"
                : "recap"
      }
    />

    {/* Plus de bloc « MOYEN DE PAIEMENT » ici : le choix du reseau EST la page
        5, rendu par les deux dernieres cards de `CartDeliverySegmentStep`. */}
  </ScrollView>
);
