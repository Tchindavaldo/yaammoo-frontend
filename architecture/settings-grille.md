# Écran Settings — grille de sections

Branche d'origine : `feature/settings-grille-sections`.

L'écran `app/(tabs)/settings.tsx` n'affiche plus des lignes pleine largeur mais
une **grille de tuiles par section**, séparées visuellement.

## Fichiers

| Fichier | Rôle |
|---|---|
| `app/(tabs)/settings.tsx` | Écran : `SectionHeader` + une `SettingGrid` par section |
| `src/features/profile/components/SettingGrid.tsx` | Bloc gris arrondi d'une section, dispose les tuiles en lignes |
| `src/features/profile/components/SettingGridItem.tsx` | Tuile pressable : pastille d'icône, libellé, `hint` optionnel |
| `src/features/profile/components/SettingGridSwitch.tsx` | Tuile portant un `Switch` (Notifications, Mode sombre) |

> R16 : `SettingGridItem` est une **copie dédiée** de `SettingItem`, qui reste
> inchangé pour les autres écrans.

## Disposition

- Une section à plusieurs items est **toujours** en grille.
- Le nombre de colonnes est constant sur toute la section et se déduit du nombre
  d'items : 1 → 1, 2/4 → 2, au-delà → 3. `columns` force la valeur.
- Les tuiles d'une même ligne partagent la largeur à parts égales : une dernière
  ligne incomplète s'étire au lieu de laisser un vide.
- Les enfants `false` / `null` (items masqués par une condition, ex. mode review
  Apple) sont ignorés, pour que la grille ne garde pas de trous.

**`cols === 1` → mode `inline`** : `SettingGrid` clone l'enfant avec
`inline: true`, et la tuile passe icône / libellé (/ `Switch`) sur une même
ligne. C'est ce que fait la section **Préférences**, forcée en `columns={1}`
parce que les tuiles à `Switch` sont trop étroites en 3 colonnes.

## Différenciation visuelle des sections

- Fond de page **blanc** ; chaque `SettingGrid` est un **bloc gris arrondi**
  (`#F2F2F7`, radius 22) ; les tuiles sont **blanches** avec bordure `#ECECF0`.
  La séparation entre sections se lit ainsi d'un coup d'œil, sans grisonner
  toute la page.

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
