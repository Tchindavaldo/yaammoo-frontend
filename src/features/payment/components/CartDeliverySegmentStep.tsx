import { Livraison } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import type { GroupedDeliveryType } from "./CartDeliveryTypeStep";
import { styles } from "./CartGroupedDeliverySheet.styles";
import { C } from "./CartPaymentSheet.styles";

const fmt = (n: number) => `${Math.round(n).toLocaleString("fr-FR")}`;

interface CartDeliverySegmentStepProps {
  delivery: Livraison;
  setDelivery: (d: Livraison) => void;
  /** Des zones express existent : sans elles la tuile « Zone » n'a rien a offrir. */
  hasExpressZones: boolean;
  /**
   * Rappel du choix de groupage fait a l'etape 1, modifiable ici sans revenir
   * en arriere : `true` = une seule course pour tout le lot.
   */
  grouped: boolean;
  /** Nombre total de commandes du lot. */
  cmd: number;
  /** Nombre de livraisons distinctes prevues si l'on ne groupe pas. */
  deliveryCount: number;
  /** Montant des articles du lot (hors livraison). */
  articlesTotal: number;
  /** Frais de la course unique, le lot etant groupe. */
  livraison: number;
  /** Tout livrer ensemble — reste sur le sheet, une seule course. */
  onGroupAll: () => void;
  /** Livraisons differentes — chaque zone reprend son propre bouton. */
  onSplit: () => void;
  onOpenLocation: () => void;
  onOpenContact: () => void;
  onOpenPeriod: () => void;
  onOpenExpress: () => void;
  onOpenVoiceNote: () => void;
  /**
   * PARTIE affichee. Le sheet ne fait plus tenir toute la livraison sur un
   * ecran (SHEET_HEIGHT reduit) : il la decoupe en pages BATIES SUR LE MEME
   * MODELE — titre, description de deux lignes, puis une rangee de cards.
   * - `group` : groupage — ensemble, separement ou sur place (page 1, 3 cards) ;
   * - `type` : type de livraison — express, a l'heure, sur place (page 2, 3
   *   cards) ;
   * - `infos` : informations — lieu, creneau, contact, note (page 3, 4 cards) ;
   * - `montants` : recapitulatif en cards — commandes, livraison, total
   *   (page 4, 3 cards) ;
   * - `recap` : COPIE de la page 4 ou les deux dernieres cards deviennent le
   *   choix du reseau, Orange Money / MTN MoMo (page 5, 3 cards) ;
   * - `all` : tout, comportement d'origine.
   */
  section?: "group" | "type" | "infos" | "montants" | "recap" | "all";
  /** Page courante et total, pour le stepper pose a droite du titre. */
  step?: number;
  stepCount?: number;
  /** Reseau de paiement retenu — cards Orange Money / MTN MoMo de la page 5. */
  network?: "orange" | "mtn";
  onNetworkChange?: (network: "orange" | "mtn") => void;
  /** Paiement parti : le reseau ne se change plus. */
  isBusy?: boolean;
}

/**
 * ETAPE de livraison en SEGMENTE + TUILES — le type se choisit dans une barre
 * segmentee (pilule blanche sur fond gris pour l'actif), les informations
 * suivent en tuiles carrees compactes : pastille d'icone, libelle, valeur.
 *
 * Variante dediee des etapes « type » / « informations » (R16 : on duplique, on
 * ne partage pas) — elle condense les deux en un seul ecran.
 */
export const CartDeliverySegmentStep: React.FC<
  CartDeliverySegmentStepProps
> = ({
  delivery,
  setDelivery,
  hasExpressZones,
  grouped,
  cmd,
  deliveryCount,
  articlesTotal,
  livraison,
  onGroupAll,
  onSplit,
  onOpenLocation,
  onOpenContact,
  onOpenPeriod,
  onOpenExpress,
  onOpenVoiceNote,
  section = "all",
  step,
  stepCount = 4,
  network,
  onNetworkChange,
  isBusy,
}) => {
  const type = (delivery.type || "express") as GroupedDeliveryType;
  const show = (s: "group" | "type" | "infos" | "montants" | "recap") =>
    section === "all" || section === s;

  const segments: {
    key: GroupedDeliveryType;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    /** Une ligne sous le libelle : ce que le mode implique concretement. */
    sub: string;
  }[] = [
    { key: "express", icon: "flash", label: "Express", sub: "Dès que prête" },
    {
      key: "standard",
      icon: "time-outline",
      label: "À l'heure",
      sub: "Vous choisissez",
    },
    {
      key: "aucune",
      icon: "briefcase-outline",
      label: "Sur place",
      sub: "Vous récupérez",
    },
  ];

  /** Heure du creneau, extraite du format "YYYY-MM-DD|HH:mm|lieu". */
  const heure = (() => {
    const parts = (delivery.hour || "").split("|");
    return /^\d{4}-\d{2}-\d{2}$/.test(parts[0])
      ? parts[1] || ""
      : parts[0] || "";
  })();

  type Tile = {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    /** Libelle court de la tuile (place contrainte). */
    label: string;
    /** Libelle complet repris par le recap, qui a toute la largeur. */
    recapLabel: string;
    value: string;
    filled: boolean;
    onPress: () => void;
  };

  const tiles: Tile[] = [];

  if (type !== "aucune") {
    tiles.push({
      key: "location",
      icon: "location-outline",
      label: "Lieu",
      recapLabel: "Lieu de livraison",
      value: delivery.address || "À remplir",
      filled: !!delivery.address,
      onPress: onOpenLocation,
    });
  } else {
    // "Sur place" : pas d'adresse à livrer, la card sert juste de rappel.
    tiles.push({
      key: "location",
      icon: "location-outline",
      label: "Lieu",
      recapLabel: "Lieu",
      value: "Récupérer sur place",
      filled: true,
      onPress: onOpenLocation,
    });
  }

  // Zone express : toujours affichee en mode express, meme sans
  // `hasExpressZones` — la boutique n'a simplement rien a proposer pour
  // l'instant, la card reste cliquable sans action tant que ce n'est pas le cas.
  if (type === "express") {
    tiles.push({
      key: "express",
      icon: "flash",
      label: "Zone express",
      recapLabel: "Zone express",
      value: delivery.expressLieu || "À remplir",
      filled: !!delivery.expressLieu,
      onPress: hasExpressZones ? onOpenExpress : () => {},
    });
  }

  if (type === "standard") {
    tiles.push({
      key: "period",
      icon: "time-outline",
      label: "Créneau",
      recapLabel: "Créneau horaire",
      value: heure || "À remplir",
      filled: !!delivery.hour,
      onPress: onOpenPeriod,
    });
  }

  if (type === "aucune") {
    // Heure de retrait en boutique : card posee, n'ouvre rien pour l'instant.
    tiles.push({
      key: "pickupHour",
      icon: "time-outline",
      label: "Heure",
      recapLabel: "Heure de retrait",
      value: "À remplir",
      filled: false,
      onPress: () => {},
    });
  }

  tiles.push({
    key: "contact",
    icon: "call-outline",
    label: "Contact",
    recapLabel: "Contact",
    value: delivery.phone || "À remplir",
    filled: !!delivery.phone,
    onPress: onOpenContact,
  });

  // Plus de tuile « Note vocale » : l'enregistrement se fait desormais depuis
  // l'overlay du lieu, a gauche de son bouton de validation.

  /**
   * Ligne de titre : intitule a gauche, STEPPER a droite — des points, un par
   * page, le point courant etire en pilule orange. Rendu unique lui aussi, les
   * trois pages devant s'aligner au pixel pres.
   */
  const renderHead = (title: string) => (
    <View style={styles.stepHead}>
      <Text style={[styles.stepTitle, styles.stepTitleFlex]} numberOfLines={1}>
        {title}
      </Text>
      {!!step && (
        <View style={styles.stepper}>
          {Array.from({ length: stepCount }, (_, i) => (
            <View
              key={i}
              style={[styles.stepDot, i === step - 1 && styles.stepDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );

  /**
   * Card de choix, RENDU UNIQUE des trois pages : pastille d'icone, titre,
   * ligne de precision. Les pages 1, 2 et 3 ne different que par leur contenu —
   * la structure et les styles sont les memes, c'est ce qui les rend
   * interchangeables a l'oeil.
   */
  const renderChoice = (c: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    sub: string;
    active: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      key={c.key}
      style={[styles.choiceCard, c.active && styles.cardActive]}
      onPress={c.onPress}
      activeOpacity={0.85}
    >
      <View style={styles.choiceDot}>
        <Ionicons name={c.icon} size={16} color={C.accent} />
      </View>
      <View style={styles.choiceText}>
        <Text style={styles.choiceTitle} numberOfLines={1}>
          {c.title}
        </Text>
        <Text style={styles.choiceSub} numberOfLines={2}>
          {c.sub}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {/* PAGE 1 — groupage : on pose la situation du lot (N livraisons sur N
          commandes), puis les trois facons d'en sortir. */}
      {show("group") && (
        <>
          {renderHead("Comment vous faire livrer ?")}
          <Text style={styles.stepSub}>
            Vos {cmd} commande{cmd > 1 ? "s" : ""} demandent {deliveryCount}{" "}
            livraison{deliveryCount > 1 ? "s" : ""} différente
            {deliveryCount > 1 ? "s" : ""}. Regroupez-les pour ne payer
            qu&apos;une seule course.
          </Text>
          <View style={styles.choiceCards}>
            {[
              {
                key: "together",
                icon: "cube-outline" as const,
                title: "Ensemble",
                sub: "Une seule course",
                active: grouped && type !== "aucune",
                onPress: () => {
                  if (type === "aucune") {
                    setDelivery({ ...delivery, statut: true, type: "express" });
                  }
                  onGroupAll();
                },
              },
              {
                key: "split",
                icon: "git-branch-outline" as const,
                title: "Séparément",
                sub: "5 livraison",
                active: !grouped && type !== "aucune",
                onPress: onSplit,
              },
              {
                key: "pickup",
                icon: "briefcase-outline" as const,
                title: "À la boutique",
                sub: "Sans frais",
                active: type === "aucune",
                onPress: () =>
                  setDelivery({ ...delivery, statut: false, type: "aucune" }),
              },
            ].map(renderChoice)}
          </View>
        </>
      )}

      {/* PAGE 2 — type de livraison. MEME structure que la page 1 : titre,
          description de deux lignes, trois cards identiques. */}
      {show("type") && (
        <>
          {renderHead("Quand souhaitez-vous être livré ?")}
          <Text style={styles.stepSub}>
            Choisissez le moment de la livraison. Express part dès que la
            commande est prête, sinon fixez vous-même le créneau.
          </Text>
          <View style={styles.choiceCards}>
            {segments.map((s) =>
              renderChoice({
                key: s.key,
                icon: s.icon,
                title: s.label,
                sub: s.sub,
                active: type === s.key,
                onPress: () =>
                  setDelivery({
                    ...delivery,
                    statut: s.key !== "aucune",
                    type: s.key,
                  }),
              }),
            )}
          </View>
        </>
      )}

      {/* PAGE 3 — informations. MEME structure que les pages 1 et 2, a ceci
          pres que la rangee porte QUATRE cards au lieu de trois : chacune ouvre
          son overlay, et l'etat rempli se lit a la bordure orange. */}
      {show("infos") && (
        <>
          {renderHead("Informations de livraison")}
          <Text style={styles.stepSub}>
            Complétez les informations de la course. Touchez une carte pour la
            remplir, chacune ouvre son formulaire.
          </Text>
          <View style={styles.choiceCards}>
            {tiles.map((t) =>
              renderChoice({
                key: t.key,
                icon: t.icon,
                title: t.label,
                sub:
                  t.key === "location" && type === "aucune"
                    ? t.value
                    : t.filled
                      ? "Rempli"
                      : "À remplir",
                active: t.filled,
                onPress: t.onPress,
              }),
            )}
          </View>
        </>
      )}

      {/* PAGE 4 — montants ET choix du reseau. La premiere card resume la
          commande (articles + course), les deux suivantes portent les operateurs
          et rappellent chacune le total a payer. */}
      {show("montants") && (
        <>
          {renderHead("Détail et moyen de paiement")}
          <Text style={styles.stepSub}>
            Vérifiez le détail de votre commande — les articles et la course —
            puis choisissez l&apos;opérateur qui réglera le montant total.
          </Text>
          <View style={styles.choiceCards}>
            <View style={[styles.choiceCard, styles.amountCard]}>
              <View style={styles.choiceDot}>
                <Ionicons name="receipt-outline" size={16} color={C.accent} />
              </View>
              {/* Deux colonnes separees par un filet, comme le recap du bas de
                  la page panier (`CartZoneFooterBar`) : intitule au-dessus,
                  montant dessous. */}
              <View style={styles.choiceText}>
                <View style={styles.amountCols}>
                  <View>
                    <Text style={styles.choiceTitle} numberOfLines={1}>
                      {cmd} Cmd
                    </Text>
                    <Text style={styles.choiceSub} numberOfLines={1}>
                      {fmt(articlesTotal)} F
                    </Text>
                  </View>
                  <View style={styles.amountSep} />
                  <View>
                    <Text style={styles.choiceTitle} numberOfLines={1}>
                      Course
                    </Text>
                    <Text style={styles.choiceSub} numberOfLines={1}>
                      {type === "aucune"
                        ? "Sur place"
                        : livraison > 0
                          ? `${fmt(livraison)} F`
                          : "Offerte"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            {(
              [
                { key: "orange", name: "Orange Money" },
                { key: "mtn", name: "Mobile Money" },
              ] as const
            ).map((p) =>
              renderChoice({
                key: p.key,
                // Radio : cercle vide au repos, coche pleine une fois choisi —
                // l'icone telephone ne disait pas lequel etait selectionne.
                icon:
                  network === p.key ? "checkmark-circle" : "ellipse-outline",
                title: p.name,
                sub: `${fmt(articlesTotal + livraison)} F`,
                active: network === p.key,
                onPress: () => {
                  if (!isBusy) onNetworkChange?.(p.key);
                },
              }),
            )}
          </View>
        </>
      )}

      {/* PAGE 5 — CONSERVEE mais PLUS ATTEINTE : le parcours s'arrete a la
          page 4, qui a repris son choix de reseau. On la garde telle quelle
          pour d'eventuelles evolutions. */}
      {/* PAGE 5 — paiement. COPIE de la page 4 : meme titre, meme description,
          meme rangee de trois cards. La premiere rappelle le montant a regler,
          les deux suivantes deviennent le choix du reseau — la capsule de
          saisie, ancree sous le sheet, remplace le bouton « Continuer ». */}
      {show("recap") && (
        <>
          {renderHead("Comment souhaitez-vous payer ?")}
          <Text style={styles.stepSub}>
            Choisissez votre opérateur, puis saisissez le numéro qui réglera la
            commande.
          </Text>
          <View style={styles.choiceCards}>
            <View style={styles.choiceCard}>
              <View style={styles.choiceDot}>
                <Ionicons name="receipt-outline" size={16} color={C.accent} />
              </View>
              <View style={styles.choiceText}>
                <Text style={styles.choiceTitle} numberOfLines={1}>
                  {cmd} commande{cmd > 1 ? "s" : ""}
                </Text>
                <Text style={styles.choiceSub} numberOfLines={2}>
                  {fmt(articlesTotal + livraison)} F
                </Text>
              </View>
            </View>
            {(
              [
                {
                  key: "orange",
                  icon: "phone-portrait-outline",
                  name: "Orange Money",
                },
                {
                  key: "mtn",
                  icon: "phone-portrait-outline",
                  name: "MTN MoMo",
                },
              ] as const
            ).map((p) =>
              renderChoice({
                key: p.key,
                icon: p.icon,
                title: p.name,
                sub: `${fmt(articlesTotal + livraison)} F`,
                active: network === p.key,
                onPress: () => {
                  if (!isBusy) onNetworkChange?.(p.key);
                },
              }),
            )}
          </View>
        </>
      )}
    </>
  );
};
