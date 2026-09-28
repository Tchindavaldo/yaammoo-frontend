# Écran Settings — grille de sections

Branche d'origine : `feature/settings-grille-sections`.

L'écran `app/(tabs)/settings.tsx` n'affiche plus des lignes pleine largeur mais
une **grille de tuiles par section**, séparées visuellement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/(tabs)/settings.tsx` | Écran : carte profil + `SectionHeader` + une `SettingGrid` par section + montage des sous-pages |
| `src/features/profile/components/SettingGrid.tsx` | Bloc gris arrondi d'une section, dispose les tuiles en lignes |
| `src/features/profile/components/SettingGridItem.tsx` | Tuile pressable : pastille d'icône, libellé, `hint` optionnel |
| `src/features/profile/components/SettingGridSwitch.tsx` | Tuile portant un `Switch` (Notifications, Mode sombre) |
| `src/features/profile/components/SettingsHeaderProfile.tsx` | Contenu du `TabHeader` partagé (prop `children`) : avatar, nom + badge Marchand, contact (maquette D) |
| `src/features/profile/components/SettingsProfileCard.tsx` | Ancien en-tête (plus monté) |
| `src/features/profile/components/DeleteAccountModal.tsx` | Modal « Supprimer mon compte » : saisie `SUPPRIMER`, loader, erreur inline |
| `src/features/profile/components/LogoutModal.tsx` | Modal de confirmation de déconnexion (+ `push-token/remove` best-effort) |
| `src/features/profile/hooks/useSettingsSubScreens.ts` | Visibilité des sous-pages (`visible` / `open` / `close`), deep-link `?section=`, reset au tap onglet et à la déconnexion |
| `src/features/profile/hooks/useNotificationSwitch.ts` | Switch Notifications : permission OS + token du device synced en BD, relu au focus |
| `src/features/profile/hooks/useSettingsTabBarStyle.ts` | Ombre de la tab bar atténuée tant que la sheet Bonus est ouverte |

> R16 : `SettingGridItem` est une **copie dédiée** de `SettingItem`, qui reste
> inchangé pour les autres écrans. Les deux modals de confirmation ont chacun
> leurs styles (aucun style partagé entre eux).

## Sous-pages

> Section **Boutique** : Commandes (`shop/orders`, copie de `(tabs)/boutique`), Gérer ma boutique, Gestion menu, Messages,
> Notifications et Portefeuille boutique ne sont plus des sous-pages montées
> ici mais des **routes entières** `app/shop/*` (hors `(tabs)`, sans navbar),
> ouvertes par `router.push("/shop/…")`. Personnel reste un `<Modal>` plein écran.

`useSettingsSubScreens` porte un état unique `Record<SettingsSubScreen, boolean>`
(Boutique, menu, portefeuilles, commandes, bonus, support, livraison,
suppression, déconnexion) :

- **Deep-link** `?section=` : `pending` / `active` / `finished` → commandes ·
  `drivers` → Personnel, onglet Livreurs · `staff` → Personnel ·
  `my-applications` → Mes demandes · `bonus` → Bonus. L'onglet d'ouverture de
  Personnel est exposé par le hook (`staffTab`).
  Chaque nouvelle valeur est traitée une seule fois (ajustement pendant le rendu).
- **Tap sur l'onglet** : tout est refermé et le param `section` est effacé.
- **Déconnexion** : les modals logout / suppression sont refermés ; leur loader
  et leur saisie vivent dans le modal, démonté par l'early-return `GuestGate`.

## Disposition

- Une section à plusieurs items est **toujours** en grille.
- Le nombre de colonnes est constant sur toute la section et se déduit du nombre
  d'items : 1 → 1, 2/4 → 2, au-delà → 3. `columns` force la valeur.
- Les tuiles d'une même ligne partagent la largeur à parts égales : une dernière
  ligne incomplète s'étire au lieu de laisser un vide.
- Les enfants `false` / `null` (items masqués par une condition, ex. mode review
  Apple) sont ignorés, pour que la grille ne garde pas de trous.
- Le titre de section est la prop `title` de `SettingGrid` : une section sans
  item affiché disparaît avec son titre.
- **Mes activités** est désactivée pour l'instant (`SHOW_ACTIVITIES` = false
  en tête de `settings.tsx`). **Livraison** est affichée (`SHOW_DELIVERY` = true).

**`cols === 1` → mode `inline`** : `SettingGrid` clone l'enfant avec
`inline: true`, et la tuile passe icône / libellé (/ `Switch`) sur une même
ligne. C'est ce que fait la section **Préférences**, forcée en `columns={1}`
parce que les tuiles à `Switch` sont trop étroites en 3 colonnes.

## Différenciation visuelle des sections

- Fond de page **blanc**, sans bloc gris : les tuiles (`DS.bg`, bordure
  `DS.line`, radius 16, pastille 36 `DS.surface`) posent directement sur la
  page. Les sections se séparent par des titres 18 / 800 `DS.ink`
  (style « Ma boutique » de la maquette C).

## Teintes d'icônes (`tone`)

`neutral` (défaut, gris) · `accent` (primaire) · `info` · `danger`. Seule la
**pastille** est teintée : la tuile garde son fond blanc, sauf `danger` qui
teinte aussi fond et bordure et passe le libellé en rouge.

## Sections

Mes activités · Compte · Boutique (marchand) · Livraison · Préférences ·
**Aide** · **Légal** · Session · Zone de danger.

> « Aide & Légal » a été scindée en deux : **Aide** (assistance, signalement,
> suggestion, contactez-nous) et **Légal** (politique & conditions,
> confidentialité).
