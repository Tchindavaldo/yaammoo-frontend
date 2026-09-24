# Profil — sheet « nom / prénom manquant »

Carte flottante qui demande le prénom et/ou le nom quand le profil ne les a
pas. Design : variantes A/B/C (carte compacte, un champ + bouton flèche).

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/features/profile/utils/missingName.ts` | `getMissingName(userData)` → `"prenom" \| "nom" \| "both" \| null` |
| `src/features/profile/hooks/useProfileNameSheet.ts` | `ProfileNameProvider` (contexte) + `useProfileNameSheet()` + `useRequireName()` |
| `src/features/profile/components/ProfileNameSheet.tsx` | Rendu : voile, carte, champs, clavier |
| `app/(tabs)/_layout.tsx` | Monte le provider autour de `Tabs` et la sheet PAR-DESSUS (tab bar comprise) |

## Détection

- Source : `userData` d'`AuthContext` (cache AsyncStorage au boot, puis API).
- ⚠️ `userFirestore.getUser()` remplit un `nom` vide par `"Utilisateur"` ou le
  préfixe de l'email : ces deux valeurs comptent comme **nom manquant**.
- Variante : prénom seul manquant → champ Prénom ; nom seul → champ Nom ;
  les deux → deux champs côte à côte.

## Quand elle s'affiche

| Déclencheur | Règle |
|---|---|
| Arrivée sur le home (`usePathname() === "/"`) | Après 700 ms, si un champ manque et que l'utilisateur ne l'a pas fermée pendant la session |
| Avant une commande — `requireName(action)` | **Toujours**, même déjà fermée. `action` n'est exécutée qu'après enregistrement |

Points de garde `requireName` :
- `app/(tabs)/index.tsx` → `handleMenuClick` : `requireAuth(() => requireName(ouvrir CheckoutSheet))`.
- `app/(tabs)/cart.tsx` → `startOrder` : `requireName(() => setGroupedDelivery(groups))`.

Validation : `PUT /user/:uid` (`userFirestore.updateUser`) puis
`setUserData` (contexte + storage). Erreur inline, jamais d'`Alert`.

## Rendu

- **Pas de `Modal`** : sur Android, un flou dans une `Modal` ne voit pas l'écran.
  La sheet est une vue absolue du layout des onglets.
- Fond : flou sur iOS ; **voile noir sur Android, toutes versions**
  (`disableAndroidBlur`) — le carrousel de bannières bouge derrière et le flou
  Android crashe dans ce cas (cf. [blur-safe-area.md](./blur-safe-area.md)).
- Safe-area : `bottom` = `8 + insets.bottom × TAB_BAR_INSET_RATIO` sur iOS
  (sinon trop haute), `24 + insets.bottom` sur Android.

## Clavier

- `edgeToEdgeEnabled` : la fenêtre n'est pas redimensionnée, la carte monte
  par `translateY` (`lift`).
- Montée : `out quad`, 75 % de la durée du clavier → la carte garde de l'avance
  et n'est jamais chevauchée. Android n'a que `keyboardDidShow` (en retard) :
  on monte dès le `onFocus` avec la dernière hauteur connue.
- Fermeture : **aucune animation**, retour en bas instantané.
- Listeners actifs seulement sheet affichée, `lift` remis à 0 à l'ouverture
  (sinon le clavier de la recherche du home la laissait au milieu de l'écran).
- Bouton : flèche = valider ; clavier ouvert → chevron qui ferme le clavier.
