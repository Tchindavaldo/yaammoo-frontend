import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";

// Sous-pages (modals / sheets) ouvertes par-dessus l'écran Settings.
export type SettingsSubScreen =
  | "editBoutique"
  | "menuManage"
  | "walletManage"
  // Section « Mes activités » (user + marchand) : commandes + portefeuille.
  | "userOrders"
  | "userWallet"
  // Bonus (Settings → Bonus et parrainage) : bottom sheet.
  | "userBonus"
  // Contactez-nous (Settings) : sheet chat support.
  | "supportChat"
  // Boutique -> Messages : discussions recues par la boutique.
  | "merchantSupport"
  // Boutique -> Notifications : envois aux clients (quota du plan).
  | "broadcast"
  // Section « Livraison » (user) + item « Livreurs » (boutique).
  | "driverApply"
  | "driverOrders"
  | "driverManage"
  | "driverMyApps"
  | "deleteAccount"
  | "logout";

export type SettingsSubScreenState = Record<SettingsSubScreen, boolean>;

const ALL_CLOSED: SettingsSubScreenState = {
  editBoutique: false,
  menuManage: false,
  walletManage: false,
  userOrders: false,
  userWallet: false,
  userBonus: false,
  supportChat: false,
  merchantSupport: false,
  broadcast: false,
  driverApply: false,
  driverOrders: false,
  driverManage: false,
  driverMyApps: false,
  deleteAccount: false,
  logout: false,
};

// Deep-link `?section=` → sous-page à ouvrir.
const SECTION_TARGET: Record<string, SettingsSubScreen> = {
  // Notifications / home « Mes commandes » → modal commandes.
  pending: "userOrders",
  active: "userOrders",
  finished: "userOrders",
  // Notif « demande de livraison » (marchand) → modal Livreurs.
  drivers: "driverManage",
  // Notif « demande décidée » (candidat) → modal Mes demandes.
  "my-applications": "driverMyApps",
  // Notif « bonus éligible » → modal Bonus.
  bonus: "userBonus",
};

/**
 * Visibilité des sous-pages de Settings : ouverture / fermeture, deep-link
 * `?section=`, reset au tap sur l'onglet et à la déconnexion.
 */
export function useSettingsSubScreens(isSignedIn: boolean) {
  const navigation = useNavigation();
  const [visible, setVisible] = useState<SettingsSubScreenState>(ALL_CLOSED);

  const open = useCallback(
    (screen: SettingsSubScreen) =>
      setVisible((v) => ({ ...v, [screen]: true })),
    [],
  );
  const close = useCallback(
    (screen: SettingsSubScreen) =>
      setVisible((v) => ({ ...v, [screen]: false })),
    [],
  );

  // Mode invité : après déconnexion/suppression, settings n'est PLUS démonté
  // (l'invité reste dans les tabs, on affiche juste le GuestGate via le
  // early-return). Sans ce reset, le modal de logout/delete réapparaissait à
  // la reconnexion. Le loader et la saisie vivent dans les modals eux-mêmes,
  // démontés par l'early-return : ils repartent donc à zéro d'office.
  // Ajusté pendant le rendu (pas dans un effet) : aucun rendu intermédiaire.
  if (!isSignedIn && (visible.logout || visible.deleteAccount)) {
    setVisible((v) => ({ ...v, logout: false, deleteAccount: false }));
  }

  // Deep-link : chaque nouvelle valeur de `?section=` (y compris celle du
  // montage) ouvre sa sous-page, une seule fois. `null` = rien encore traité.
  const { section } = useLocalSearchParams<{ section?: string }>();
  const [handledSection, setHandledSection] = useState<
    string | null | undefined
  >(null);
  if (section !== handledSection) {
    setHandledSection(section);
    // hasOwnProperty : `?section=constructor` ne doit rien ouvrir.
    if (
      section &&
      Object.prototype.hasOwnProperty.call(SECTION_TARGET, section)
    ) {
      const target = SECTION_TARGET[section];
      setVisible((v) => ({ ...v, [target]: true }));
    }
  }

  // Tap sur l'onglet Parametres : on revient TOUJOURS a la page Parametres nue,
  // quelle que soit la sous-page (modal) ouverte par-dessus.
  useEffect(() => {
    const unsubscribe = navigation.addListener("tabPress" as any, () => {
      setVisible(ALL_CLOSED);
      // Sans ca, le param de deep-link encore present rouvrirait le modal.
      if (section) router.setParams({ section: undefined });
    });
    return unsubscribe;
  }, [navigation, section]);

  return { visible, open, close };
}
