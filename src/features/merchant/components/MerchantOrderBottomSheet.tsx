"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import { GlobalToastHost } from "@/src/components/GlobalToastHost";
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Easing, PanResponder, Pressable, Modal,
} from 'react-native';
// Safe-area basse au ratio par OS (iOS 0.5 / Android 1), cf. blur-safe-area.md §4.
import { useSheetSafeInsets as useSafeAreaInsets } from '@/src/hooks/usePageBottomInset';
import { SafeAreaDebugBand } from '@/src/components/SafeAreaDebugBand';
import { Commande } from '@/src/types';
import { Toast } from '@/src/components/Toast';
import { LivraisonTab } from './MerchantOrderLivraisonTab';
import { CommandesTab } from './MerchantOrderCommandesTab';
import { MontantTab } from './MerchantOrderMontantTab';
import { orderGroupKey } from '../utils/orderGroupKey';
import { DriverInfoTab } from '@/src/features/orders/components/DriverInfoTab';
import { t as tr, useLanguage } from "@/src/i18n";
import { buildUser } from '../utils/merchantOrderSheetData';
import { CMD_BAR_HEIGHT, SHEET_HEIGHT, styles } from './MerchantOrderBottomSheet.styles';
import { MerchantOrderDeleteConfirm } from './MerchantOrderDeleteConfirm';
import { MerchantOrderSheetHeader } from './MerchantOrderSheetHeader';
import { useMerchantOrderCancel } from '../hooks/useMerchantOrderCancel';

// Distance de sortie des animations d'ouverture/fermeture. On translate d'un
// ÉCRAN ENTIER et non de `SHEET_HEIGHT` : avec plusieurs zones le sheet mesure
// `SHEET_HEIGHT + CMD_BAR_HEIGHT` (barre de chips « Cmd »), si bien qu'une
// translation de `SHEET_HEIGHT` laissait cette barre visible en bas, figée,
// jusqu'au démontage du Modal.
const OFFSCREEN_Y = Dimensions.get('window').height;

export type { OrderItem, DeliveryUser } from '../utils/merchantOrderSheetData';

type Tab = 'livraison' | 'commandes' | 'montant' | 'livreur';

type Props = {
  order: Commande | null;
  visible: boolean;
  onClose: () => void;
  allOrders?: Commande[];
  /**
   * Toutes les commandes de la boutique. L'onglet Montant y recompose le groupe
   * ABSOLU de la commande affichée (même clé de groupage), indépendamment du
   * filtre de statut de la liste : le récap est donc identique en « En attente »,
   * « En cours » ou « Terminées ».
   */
  groupPool?: Commande[];
  /** Validation d'UNE commande (le bouton vit dans l'onglet Commande). */
  onValidate?: (order: Commande) => Promise<void> | void;
  /** Masque le bouton Valider quand la commande n'est plus validable. */
  canValidate?: boolean;
};

// ─── Composant principal ──────────────────────────────────────────────────────
export default function MerchantOrderBottomSheet({
  order, visible, onClose, allOrders, groupPool, onValidate, canValidate = false,
}: Props) {
  useLanguage();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('livraison');
  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);
  const [validating, setValidating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const translateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Commande sélectionnée (globale : pilote Livraison ET Commande)
  const currentOrder = allOrders ? (allOrders[selectedOrderIdx] ?? order) : order;
  const user = currentOrder ? buildUser(currentOrder) : null;
  // Corbeille du header : annulation de la Cmd SELECTIONNEE ; la confirmation remplace le contenu de tout onglet.
  const cancel = useMerchantOrderCancel(currentOrder?.id, () => {
    // Derniere commande du sheet : on le ferme ; sinon la liste se met a jour par socket.
    if (orderList.length <= 1) handleDismiss();
  });

  // ─── Garde de consultation ──────────────────────────────────────────────────
  // Une commande contenant des extras/boissons doit avoir son onglet Commande
  // ouvert ET scrollé jusqu'en bas avant de pouvoir être validée.
  const orderList = allOrders && allOrders.length > 0 ? allOrders : (order ? [order] : []);
  const [checkedIdx, setCheckedIdx] = useState<Set<number>>(new Set());
  // Commandes déjà validées pendant cette ouverture : le sheet ne se ferme que
  // lorsqu'il n'en reste plus aucune à traiter.
  const [validatedIdx, setValidatedIdx] = useState<Set<number>>(new Set());

  // ─── Zones du groupe ────────────────────────────────────────────────────────
  // Le header liste les ZONES, la barre sous les onglets les « Cmd » de la zone
  // sélectionnée. L'onglet Montant est donc toujours celui d'UNE zone, quelle
  // que soit la Cmd choisie — jamais un mélange de zones.
  const zoneOf = useCallback((o: Commande | null | undefined): string => {
    const d = (o as any)?.delivery;
    if (!d || d.status !== true) return tr("Sur place");
    return d.zone || d.location || tr("Zone inconnue");
  }, []);

  const zones = useMemo(() => {
    const seen: string[] = [];
    orderList.forEach((o) => {
      const z = zoneOf(o);
      if (!seen.includes(z)) seen.push(z);
    });
    return seen;
  }, [orderList, zoneOf]);

  const [selectedZone, setSelectedZone] = useState<string>(() => zoneOf(order));

  // Réouverture du sheet sur une autre ligne : on repart de la zone affichée.
  useEffect(() => {
    if (visible) setSelectedZone(zoneOf(order));
  }, [visible, order, zoneOf]);

  // Commandes de la zone sélectionnée, avec leur index dans `orderList`.
  const zoneEntries = useMemo(
    () =>
      orderList
        .map((o, idx) => ({ o, idx }))
        .filter(({ o }) => zoneOf(o) === selectedZone),
    [orderList, selectedZone, zoneOf],
  );

  /**
   * Changement de zone : on pose la zone ET sa première commande dans le MÊME
   * rendu. Ne mettre à jour que `selectedZone` laissait l'effet ci-dessous
   * recaler `selectedOrderIdx` au rendu suivant — la barre de chips « Cmd »
   * s'affichait une frame avec l'ancienne sélection, d'où un scintillement.
   */
  const selectZone = useCallback(
    (zone: string) => {
      setSelectedZone(zone);
      const first = orderList.findIndex((o) => zoneOf(o) === zone);
      if (first !== -1) setSelectedOrderIdx(first);
    },
    [orderList, zoneOf],
  );

  // Filet de sécurité : si la sélection courante n'appartient plus à la zone
  // (commande validée/retirée), on retombe sur la première de la zone.
  useEffect(() => {
    if (zoneEntries.length === 0) return;
    if (!zoneEntries.some(({ idx }) => idx === selectedOrderIdx)) {
      setSelectedOrderIdx(zoneEntries[0].idx);
    }
  }, [zoneEntries, selectedOrderIdx]);

  const markChecked = useCallback((idx: number) => {
    setCheckedIdx((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  }, []);

  // Contenu à vérifier de la commande AFFICHÉE (la garde est propre à chaque Cmd).
  const hasExtra = (currentOrder?.extra || []).some(
    (e: any) => e.status === true && e.name && e.name !== 'Aucun' && e.name !== 'Aucune',
  );
  const hasDrink = (currentOrder?.drink || []).some(
    (d: any) => d.status === true && d.name && d.name !== 'Aucune' && d.name !== 'Aucun',
  );
  // Rien à vérifier → considérée consultée d'office.
  const currentChecked = (!hasExtra && !hasDrink) || checkedIdx.has(selectedOrderIdx);

  /** Message du toast pour la commande affichée. */
  const buildBlockedMessage = () => {
    const label = hasExtra && hasDrink ? tr("extras et boissons")
      : hasExtra ? 'extras'
        : tr("boissons");
    // Même numéro que le chip du header : le vrai rang, pas la position.
    const rank = (orderList[selectedOrderIdx] as any)?.rank ?? selectedOrderIdx + 1;
    const prefix = orderList.length > 1 ? `Cmd ${rank} : ` : '';
    return tr("{{a}}{{b}} non vérifiés — faites défiler la liste", { a: prefix, b: label });
  };

  const handleValidate = async () => {
    if (validating) return;
    if (!currentChecked) {
      setToastMsg('');
      // Re-déclenche l'animation même si le message est identique.
      requestAnimationFrame(() => setToastMsg(buildBlockedMessage()));
      return;
    }
    setValidating(true);
    try {
      await onValidate?.(currentOrder!);

      // Commandes restant à traiter une fois celle-ci validée.
      const done = new Set(validatedIdx);
      done.add(selectedOrderIdx);
      setValidatedIdx(done);
      const remaining = orderList
        .map((_, i) => i)
        .filter((i) => !done.has(i));

      if (remaining.length === 0) {
        handleDismiss();
      } else {
        // Il reste des commandes : on bascule sur la première non traitée.
        setSelectedOrderIdx(remaining[0]);
      }
    } finally {
      setValidating(false);
    }
  };

  // Tab « Livreur » (lecture seule côté marchand) : course lancée/terminée,
  // qu'un livreur soit délégué ou que le marchand livre lui-même.
  const showDriverTab =
    currentOrder?.status === 'delivering' ||
    currentOrder?.status === 'delivered';
  const total = user ? user.orders.reduce((s, o) => s + (o.unitPrice || 0) * o.qty, 0) : 0;

  // Livraison offerte (bonus/campagne couvert par le fastfood) ou mutualisée sur
  // un groupe de livraison : dans les deux cas, pas de prix sur cette commande.
  const offer = (currentOrder as any)?.deliveryOffer;
  const deliveryOffered = offer?.active === true && offer?.coveredBy === 'fastfood';
  // « Cmd groupée » n'a de sens qu'à partir de 2 commandes portant le MÊME
  // deliveryGroupId : seule une commande avec ce groupe ne mutualise rien.
  const currentGroupId = (currentOrder as any)?.deliveryGroupId;
  const deliveryGrouped =
    !!currentGroupId &&
    orderList.filter((o) => (o as any).deliveryGroupId === currentGroupId).length > 1;
  const billableDelivery =
    deliveryOffered || deliveryGrouped ? 0 : (user?.deliveryPrice ?? 0);
  const hasMultiple = allOrders && allOrders.length > 1;

  // Groupe ABSOLU de la commande affichée : toutes les commandes de la boutique
  // partageant sa clé de groupage, tous statuts confondus. Le récap de l'onglet
  // Montant ne dépend donc pas de l'onglet de statut d'où le sheet a été ouvert.
  const montantOrders = useMemo(() => {
    if (!currentOrder) return [];
    // `pendingToBuy` = encore dans le panier du client, jamais commandée :
    // elle ne doit pas gonfler le récap du marchand. Idem pour les annulées.
    const IGNORED = ['pendingToBuy', 'cancelByUser', 'cancelByFastFood'];
    const raw = groupPool && groupPool.length > 0 ? groupPool : orderList;
    const pool = raw.filter((o) => !IGNORED.includes(o.status));
    // Ancré sur la ZONE sélectionnée (et non sur la Cmd affichée) : le récap ne
    // change pas quand on passe d'une Cmd à l'autre, et n'inclut jamais une
    // autre zone.
    const anchor = zoneEntries[0]?.o || currentOrder;
    const key = orderGroupKey(anchor);
    const group = pool.filter((o) => orderGroupKey(o) === key);
    return group.length > 0 ? group : zoneEntries.map(({ o }) => o);
  }, [currentOrder, zoneEntries, groupPool, orderList]);

  const showMontantTab = montantOrders.length > 1;

  // On dépend de l'ID et non de l'objet `order` : au retour d'arrière-plan, un
  // refresh des données fournit une nouvelle référence pour la MÊME commande, ce
  // qui rejouait l'animation d'ouverture (le sheet semblait se fermer/rouvrir).
  const orderId = order?.id;
  useEffect(() => {
    if (!visible || !orderId) return;
    translateY.setValue(OFFSCREEN_Y);
    overlayOpacity.setValue(0);
    setTab('livraison');
    setSelectedOrderIdx(0);
    setCheckedIdx(new Set());
    setValidatedIdx(new Set());
    setToastMsg('');
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 25, stiffness: 180, mass: 0.8 }),
      Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [visible, orderId]);

  // Changer de Cmd ou de zone ferme la confirmation.
  useEffect(() => { cancel.dismiss(); }, [selectedOrderIdx, selectedZone, visible]);

  // Revenir à Livraison si la commande courante n'a plus de tab Livreur.
  useEffect(() => {
    if (tab === 'livreur' && !showDriverTab) setTab('livraison');
    if (tab === 'montant' && !showMontantTab) setTab('livraison');
  }, [tab, showDriverTab, showMontantTab]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: OFFSCREEN_Y, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 100) handleDismiss();
        else Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
      },
    })
  ).current;

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={StyleSheet.absoluteFill} pointerEvents="auto">
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            zones.length > 1 && { height: SHEET_HEIGHT + CMD_BAR_HEIGHT },
            // Hauteur augmentée de l'inset bas : la barre de navigation
            // système recouvrait le bas du sheet.
            { height: (zones.length > 1 ? SHEET_HEIGHT + CMD_BAR_HEIGHT : SHEET_HEIGHT) + insets.bottom, paddingBottom: insets.bottom },
            { transform: [{ translateY }] },
          ]}
        >
          <MerchantOrderSheetHeader
            user={user}
            hasMultiple={!!hasMultiple}
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={selectZone}
            orderList={orderList}
            selectedOrderIdx={selectedOrderIdx}
            onSelectOrder={setSelectedOrderIdx}
            panHandlers={panResponder.panHandlers}
            onDelete={cancel.ask}
          />

          {/* Top tabs : Livraison | Commande | (Livreur) */}
          <View style={styles.tabBar}>
            {(
              [
                'livraison',
                'commandes',
                // Le récap Montant n'a d'intérêt qu'à partir de 2 commandes groupées.
                ...(showMontantTab ? ['montant'] : []),
                ...(showDriverTab ? ['livreur'] : []),
              ] as Tab[]
            ).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tab, tab === t && styles.tabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                  {t === 'livraison'
                    ? tr("Livraison")
                    : t === 'commandes'
                      ? tr("Commande")
                      : t === 'montant'
                        ? tr("Montant")
                        : tr("Livreur")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Multi-zones seulement : le header porte les zones, cette barre les
              « Cmd » de la zone choisie (affichée même s'il n'y en a qu'une).
              Zone unique → les chips Cmd restent dans le header, comme avant. */}
          {zones.length > 1 && zoneEntries.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.zoneCmdBar}
              contentContainerStyle={styles.zoneCmdScroll}
            >
              {zoneEntries.map(({ o, idx }) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.cmdChip, selectedOrderIdx === idx && styles.cmdChipActive]}
                  onPress={() => setSelectedOrderIdx(idx)}
                >
                  <Text
                    style={[
                      styles.cmdChipText,
                      selectedOrderIdx === idx && styles.cmdChipTextActive,
                    ]}
                  >
                    {/* Vrai rang de la commande, aligné sur l'onglet Montant. */}
                    Cmd {(o as any).rank ?? idx + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Contenu (change avec le tab, réactif à selectedOrderIdx) */}
          {cancel.message ? (
            <MerchantOrderDeleteConfirm
              rank={(currentOrder as any)?.rank ?? selectedOrderIdx + 1}
              detail={cancel.message}
              busy={cancel.busy}
              onNo={cancel.dismiss}
              onYes={cancel.confirm}
            />
          ) : tab === 'livreur' && showDriverTab ? (
            <ScrollView
              style={styles.content}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              <DriverInfoTab order={currentOrder!} allowRating={false} />
            </ScrollView>
          ) : tab === 'montant' ? (
            <MontantTab orders={montantOrders} />
          ) : tab === 'livraison' ? (
            <ScrollView
              style={[
                styles.content,
                // Onglet Livraison : cartes déjà espacées, on colle un peu plus
                // la barre de chips.
                zones.length > 1 && { paddingTop: 8 },
              ]}
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              <LivraisonTab user={user} />
            </ScrollView>
          ) : (
            <CommandesTab
              // Remonte la tab à zéro et réarme la détection à chaque changement de Cmd.
              key={selectedOrderIdx}
              orders={user.orders}
              total={total + billableDelivery}
              zone={user.zone}
              deliveryPrice={user.deliveryPrice}
              deliveryOffered={deliveryOffered}
              deliveryGrouped={deliveryGrouped}
              onFullyScrolled={() => markChecked(selectedOrderIdx)}
              canValidate={canValidate}
              checked={currentChecked}
              validating={validating}
              onValidate={handleValidate}
            />
          )}

          <SafeAreaDebugBand />
        </Animated.View>

        {/* Toast de blocage (au-dessus du sheet) */}
        {toastMsg ? (
          <Toast
            message={toastMsg}
            type="error"
            duration={3000}
            onHide={() => setToastMsg('')}
          />
        ) : null}
      </View>
      {/* Toast global au premier plan (Android). */}
      <GlobalToastHost modal />
    </Modal>
  );
}
