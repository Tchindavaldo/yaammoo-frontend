"use no memo"; // langue a chaud : le React Compiler figerait les textes t() (cf. architecture/i18n.md)
import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ProfileListGroup, ProfileListRow } from "@/src/features/profile/components/ProfileListGroup";
import { useMerchantMode } from "@/src/features/merchant/context/MerchantModeContext";
import { showToast } from "@/src/services/globalToast";
import { LANGUAGES, getLanguage, t, useLanguage } from "@/src/i18n";
import { DS } from "@/src/theme/ds";

interface Props {
  notifEnabled: boolean;
  onNotifToggle: (on: boolean) => void;
  darkMode: boolean;
  onDarkMode: (on: boolean) => void;
  onLanguage: () => void;
}

type Ion = React.ComponentProps<typeof ProfileListRow>["icon"];
const TEAM: { icon: Ion; title: string; href: string; perm: string }[] = [
  { icon: "chatbubbles-outline", title: "Messages", href: "/shop/messages", perm: "support.reply" },
  { icon: "people-outline", title: "Personnel", href: "/shop/staff", perm: "staff.manage" },
  { icon: "bicycle-outline", title: "Livreurs", href: "/shop/drivers", perm: "staff.manage" },
];
const MANAGE: { icon: Ion; title: string; href: string; perm: string }[] = [
  { icon: "restaurant-outline", title: "Gestion menu", href: "/shop/menu", perm: "menus.manage" },
  { icon: "wine-outline", title: "Gestion boisson", href: "/shop/drinks", perm: "menus.manage" },
  { icon: "megaphone-outline", title: "Gestion annonce", href: "/shop/notifications", perm: "notifications.send" },
];

/**
 * Profil en mode personnel : Messages / Personnel / Livreurs, puis Gestion
 * menu / boisson / annonce, puis Notifications / Mode sombre / Langue /
 * Contactez-nous. Sans la permission du role : toast, la page ne s'ouvre pas.
 */
export function StaffProfileSections({ notifEnabled, onNotifToggle, darkMode, onDarkMode, onLanguage }: Props) {
  useLanguage();
  const router = useRouter();
  const { can } = useMerchantMode();
  const go = (href: string, perm: string) =>
    can(perm) ? router.push(href as any) : showToast(t("Vous n'avez pas les droits pour accéder à cela"), "error");
  const rows = (list: typeof TEAM) =>
    list.map((x) => <ProfileListRow key={x.href} icon={x.icon} title={t(x.title)} onPress={() => go(x.href, x.perm)} />);

  return (
    <>
      <ProfileListGroup>{rows(TEAM)}</ProfileListGroup>
      <View style={styles.sectionLine} />
      <ProfileListGroup>{rows(MANAGE)}</ProfileListGroup>
      <View style={styles.sectionLine} />
      <ProfileListGroup>
        <ProfileListRow
          icon="notifications-outline"
          title="Notifications"
          hint={notifEnabled ? t("Activées") : t("Désactivées")}
          onPress={() => onNotifToggle(!notifEnabled)}
        />
        <ProfileListRow icon="moon-outline" title={t("Mode sombre")} hint={darkMode ? t("Oui") : t("Non")} onPress={() => onDarkMode(!darkMode)} />
        <ProfileListRow
          icon="language-outline"
          title={t("Langue")}
          hint={LANGUAGES.find((l) => l.code === getLanguage())?.label}
          onPress={onLanguage}
        />
        <ProfileListRow icon="call-outline" title={t("Contactez-nous")} onPress={() => router.push("/account/support")} />
      </ProfileListGroup>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLine: { height: 1, backgroundColor: DS.line, marginTop: 16 },
});
