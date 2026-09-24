# Flou (BlurView) & safe-area des bottom sheets

Deux sujets liés au rendu natif Android, traités ensemble parce qu'ils touchent
les mêmes écrans : le flou d'arrière-plan et la barre de navigation système.

---

## 1. AppBlurView — flou unifié iOS / Android

Fichier : [`src/components/AppBlurView.tsx`](../src/components/AppBlurView.tsx)

**Aucun composant ne doit importer `BlurView` depuis `expo-blur` directement.**
Tous passent par `AppBlurView`, importé sous l'alias `BlurView` :

```tsx
import { AppBlurView as BlurView } from "@/src/components/AppBlurView";
```

### Pourquoi

`expo-blur` ne floute rien sur Android tant qu'on ne passe pas
`experimentalBlurMethod="dimezisBlurView"`. Ce mode s'appuie sur la bibliothèque
`eightbitlab` (`RenderEffectBlur` à partir d'API 31, `RenderScriptBlur` en
dessous) — dans les **deux** cas via le même `PreDrawBlurController`.

Ce contrôleur redessine tout l'arbre de vues avant chaque frame. Cette seconde
traversée entre en conflit avec la passe de dessin du système sur les
`ViewGroup` dont les enfants ont un `zIndex` : la liste d'enfants pré-ordonnée
est partagée entre les deux passes, l'une la vide pendant que l'autre la
parcourt. Résultat :

```
java.lang.IndexOutOfBoundsException: Index: 1, Size: 0
  android.view.ViewGroup.getAndVerifyPreorderedView
  eightbitlab.com.blurview.PreDrawBlurController.updateBlur
```

Le crash se déclenche dès qu'un contenu bouge derrière un BlurView — donc sur
toute liste qui scrolle sous un header ou une tab bar.

> ⚠️ **Le seuil API 31 ne protège PAS de ce crash.** Il a longtemps été présenté
> comme tel dans ce fichier : c'est faux. Le crash a été constaté sur
> **Android 16**, au scroll du home, avec `RenderEffectBlur` actif. Le seuil ne
> décide que de la *qualité* du flou, pas de sa stabilité.

### Comportement

> ⚠️ **SDK 57 : le flou Android exige une CIBLE.** `expo-blur` 57 ne floute
> sur Android que le contenu enveloppé dans un `BlurTargetView` passé via
> `blurTarget` ; sans cible il retombe en voile. La bibliothèque native
> (`eightbitlab` v3) **interdit** qu'un flou soit DANS la cible qu'il floute :
> contenu et flou doivent être frères. `experimentalBlurMethod` est déprécié
> et n'est plus passé nulle part (`AppBlurView` pose
> `blurMethod="dimezisBlurViewSdk31Plus"`).
>
> Mécanisme : [`src/components/BlurTarget.tsx`](../src/components/BlurTarget.tsx).
>
> ```tsx
> <BlurScope>
>   <BlurTarget style={…}>{contenu derrière le flou}</BlurTarget>  // remplace un View
>   <Header />  // son AppBlurView floute la cible de la zone
> </BlurScope>
> ```
>
> - `BlurTarget` = drop-in d'un `View` (iOS/web : simple `View`, aucun effet).
> - Un `AppBlurView` DANS un `BlurTarget` ne vise pas cette cible (contexte
>   remis à null) : il lui faut son propre `BlurScope` imbriqué.
> - Onglets : `(tabs)/_layout.tsx` enveloppe chaque écran (`screenLayout`) ;
>   seule la cible de l'écran focalisé (`active`) est floutée par la tab bar.
> - `useNativeBlurActive()` : `true` si un flou a réellement lieu à cet endroit
>   — `TabHeader` et `RestaurantHeader` s'en servent pour opacifier leur fond.
> - Pas de cible sur le home (la liste ne passe pas sous le header) ni dans les
>   `Modal` RN (fenêtre séparée : rien à flouter derrière).
> - Le voile de la sheet d'auth (`AuthGateContext`) floute toute l'app,
>   enveloppée dans une cible : **perf du scroll home à vérifier sur appareil**.

- **iOS** : flou natif (`UIVisualEffectView`), rien à configurer.
- **Android 12+** : flou natif si une cible existe dans la zone, sinon `View`
  opacifiée par `fallbackStyle`.
- **Android < 12** : flou désactivé, rendu en `fallbackStyle`.
- **`disableAndroidBlur`** : coupe le flou sur Android **toutes versions
  confondues**. À poser sur tout BlurView placé devant une liste qui défile.

```tsx
<BlurView disableAndroidBlur fallbackStyle={styles.opaque} … />
```

Posé aujourd'hui sur les **10 blurs des cartes du home**
(`restaurants/components/designs/item/` : variantes + `parts/CardBottom.tsx`), seul écran où le crash a été
reproduit. Le header et la tab bar gardent leur flou pour l'instant — à basculer
si le crash y réapparaît.

Sans flou, les éléments qui reposaient dessus deviennent illisibles : ils portent
alors **eux-mêmes** un fond opaque, conditionné à Android pour ne rien changer sur
iOS. Cf. `v4StockLeftSection` (« N en stock » + barre de progression) et
`v4DeliveryStrip` (« Prochaine livraison ») — ce dernier est une **copie dédiée**
de `v5DeliveryStrip`, partagé avec un autre design qu'on ne voulait pas toucher
(R16).

`isNativeBlurAvailable` est exporté pour adapter les couleurs : sans flou, un
fond semi-transparent laisse lire le contenu situé derrière, il faut donc
l'opacifier. C'est fait sur `RestaurantHeader`, `TabHeader`, la tab bar
([`app/(tabs)/_layout.tsx`](<../app/(tabs)/_layout.tsx>)), le header de settings et
la carte récap de paiement.

```tsx
<View style={[styles.header, !isNativeBlurAvailable && styles.headerOpaque]}>
```

Le prop `fallbackStyle` fait la même chose sur le BlurView lui-même : quand le
flou n'est pas disponible, `AppBlurView` rend alors une `View` simple — en mode
`"none"`, expo-blur écrase la couleur de fond de la vue native avec son propre
voile, ce qui rendrait le style sans effet.

Cette `View` de repli est `pointerEvents="none"` par défaut, comme un vrai
BlurView : sans cela elle **avalait le drag** des listes rendues dessous (bug du
voile de `GroupedPeriodOverlay`). Les BlurView qui **portent** des contrôles
doivent donc passer `pointerEvents="auto"` — c'est le cas des pickers marchand,
de `RestaurantHeader`, `OrderHeader`, `MenuManagePanel` et du header de settings.
Le chemin `disableAndroidBlur`, lui, ne pose rien : il enveloppe du contenu
interactif (badges, barre de stock).

### Limite dans une Modal

`dimezisBlurView` ne floute que le contenu de **sa propre fenêtre**. Une `Modal`
React Native est une fenêtre séparée : un BlurView placé dedans ne voit ni
l'écran, ni le sheet qui l'héberge. C'est pour cette raison que la capsule de
paiement ne floute rien sur Android, alors qu'elle floute sur iOS, où le
compositeur système traite toutes les fenêtres.

Le seul flou qui fonctionne dans le sheet de paiement est le voile affiché quand
le clavier s'ouvre ([`CheckoutPaymentOverlay`](../src/features/checkout/components/CheckoutPaymentOverlay.tsx)) :
il floute la carte récap, qui est dans la même fenêtre que lui.

---

## 2. Safe-area des bottom sheets

Sur Android, un conteneur ancré en `bottom: 0` passe **sous** la barre de
navigation système. Tous les bottom sheets utilisent donc le hook
`useSafeAreaInsets()` — pas le composant `SafeAreaView`, inadapté à un conteneur
absolu animé.

Deux formes selon la structure du sheet :

```tsx
// Sheet à hauteur fixe : on l'agrandit et on décale son footer.
{ height: SHEET_HEIGHT + insets.bottom }
{ paddingBottom: 16 + insets.bottom }   // dans le footer

// Sheet dimensionné par son contenu : padding bas uniquement.
{ paddingBottom: 28 + insets.bottom }
```

> **Sheets de commande (home + panier) et leurs 7 overlays** : `insets` vient de
> `checkout/hooks/useSheetInsets.ts`, pas de `useSafeAreaInsets`. Il ne garde
> qu'une part de `insets.bottom`, réglée **séparément par OS** :
> `SHEET_INSET_RATIO_IOS = 0.5` (l'inset complet laissait un grand vide sur
> iPhone), `SHEET_INSET_RATIO_ANDROID = 1` (inchangé). Sheet et overlays doivent
> tous passer par ce hook, sinon les overlays ne recouvrent plus le sheet.

Sheets traités :

| Sheet | Fichier |
|---|---|
| Commande (home) | `checkout/components/CheckoutSheet.tsx` + `CheckoutFooter.tsx` |
| Commande (panier) | `checkout/components/CartCheckoutSheet.tsx` + `CartCheckoutFooter.tsx` |
| Capsule + récap de paiement | `checkout/components/CheckoutPaymentOverlay.tsx`, `CheckoutPaymentTopOverlay.tsx` |
| Commande client | `orders/components/OrderBottomSheet.tsx` |
| Commande marchand | `merchant/components/MerchantOrderBottomSheet.tsx` |
| Détail notification | `notifications/components/NotificationDetailSheet.tsx` |
| Ajout menu | `merchant/components/AddMenuSheet.tsx`, `AddMenuSheetMultiStep.tsx` |
| Zone de livraison (+ time picker) | `merchant/components/edit-boutique/ZoneFormSheet.tsx` |
| Nom / prénom manquant (home) | `profile/components/ProfileNameSheet.tsx` — carte flottante `bottom: 24 + insets.bottom`, montée au clavier par translation (`edgeToEdgeEnabled` ne redimensionne pas la fenêtre), rendue dans `app/(tabs)/_layout.tsx` au-dessus de la tab bar pour que le flou couvre tout l'écran (iOS seulement : `disableAndroidBlur`, voile noir sur Android toutes versions). Bas iOS : `8 + insets.bottom × TAB_BAR_INSET_RATIO` — cf. [profile-name-sheet.md](./profile-name-sheet.md) |

Non concernés : les panneaux plein écran des settings (`MenuManageModal`,
`WalletManageModal`, `UserOrdersModal`, `UserWalletModal`, `DriverManageModal`),
qui ne sont pas des `<Modal>` mais des vues absolues dont le contenu gère son bas,
et les pickers de `BoutiquePickers`, centrés à l'écran.

| Paiement du panier | `payment/components/CartPaymentSheet.tsx` |

`CartPaymentSheet` est rendu dans sa **propre `Modal`** : il n'hérite d'aucun
inset parent et l'applique donc lui-même, sur le `paddingBottom` du sheet
(`18 + insets.bottom`). Sa hauteur n'est pas fixe (`maxHeight: 88%`, contenu
scrollable), l'entrée/sortie se fait en `translateY`.

**Les couches internes d'un sheet n'ajoutent pas l'inset** (`DriverInfoTab`,
`RateMenuTab`) : elles héritent de celui du sheet parent, l'ajouter à nouveau
doublerait la marge.

### Cas particulier : overlays ancrés en `bottom: 0`

Les overlays de la section livraison ne sont PAS imbriqués dans le sheet : ce
sont des calques absolus ancrés en `bottom: 0`, qui doivent recouvrir le sheet
exactement. Ils n'héritent donc d'aucun inset et **l'ajoutent eux-mêmes** :

```tsx
const insets = useSafeAreaInsets();
const sheetHeight = SHEET_HEIGHT + insets.bottom;  // meme calcul que le sheet
```

Sans cela l'overlay s'arrête au-dessus du bord bas du sheet, laissant une bande
visible de la hauteur exacte de la barre de navigation.

| Overlays | Hauteur nue | Sheet couvert |
|---|---|---|
| `checkout/components/Checkout{Location,Contact,Period,Express,VoiceNote}Overlay.tsx` | 384 | Commande (home / panier) |
| `payment/components/overlays/Grouped*Overlay.tsx` | 471 | Livraison groupée |

#### ⚠️ Liste scrollable dans un overlay — trois pièges Android

Constatés sur `GroupedPeriodOverlay` puis `CheckoutPeriodOverlay` (liste des
créneaux). Les trois se manifestent **pareil** : le tap fonctionne, le drag ne
fait rien. À vérifier dans cet ordre avant de toucher aux hauteurs.

| Cause | Symptôme | Correctif |
|---|---|---|
| **`elevation` du sheet > celle de l'overlay** | Android ordonne les touches par `elevation`, **pas** par `zIndex`. Le sheet (`elevation: 20`) reçoit le geste et son propre ScrollView le consomme | `elevation: 30` sur le `keyboardWrapper` de l'overlay |
| **`opacity` animée en driver natif** | Le calque de composition n'achemine plus les `move` aux scrollables enfants. Le `down` passe (tap OK), les `move` sont perdus | `useNativeDriver: false` sur l'animation de `fade` |
| **`transform` animé sur un parent** | Même effet, coordonnées mal converties | Décaler `bottom` plutôt que `transform` |

Deux autres points sur ces listes :

- **`maxHeight` explicite**, pas seulement `flex: 1` + `minHeight: 0` : sur
  Android le calcul flex ne bornait pas la liste, qui débordait au lieu de
  scroller (cf. `SLOT_LIST_CHROME`).
- **`overflow: "hidden"` + `elevation` sur la même vue** : combinaison à éviter,
  elle casse le rendu et la propagation des touches.

Ces overlays portent aussi leur propre fondu d'entrée/sortie (180 ms / 150 ms) :
le parent les monte et démonte d'un coup (`{open === "express" && …}`), la
fermeture est donc retardée par un `closeWithFade` local le temps de l'animation.
Quand un overlay anime déjà le clavier (`Location`, `Contact`), les deux
animations tournent côte à côte — drivers différents (layout / natif), elles ne
peuvent pas être groupées dans un `Animated.parallel`.

---

## 3. Safe-area de la tab bar

La barre d'onglets ne réserve **qu'une fraction** de `insets.bottom` :
`TAB_BAR_INSET_RATIO` — **0,9 sur Android**, **0,5 sur iOS** — exporté par
[`src/hooks/useTabBarHeight.ts`](../src/hooks/useTabBarHeight.ts). La prendre en
entier laissait un grand vide sous les icônes sur iPhone ; Android en garde
presque tout, ses touches de navigation étant physiquement plus hautes.

Ce ratio est utilisé aux **deux** endroits, qui doivent rester alignés :

| Consommateur | Usage |
|---|---|
| [`app/(tabs)/_layout.tsx`](<../app/(tabs)/_layout.tsx>) | `height` et `paddingBottom` de la `tabBarStyle` |
| `useTabBarHeight()` | hauteur lue par tous les écrans pour leur `paddingBottom` de liste et leurs barres flottantes (`cart.tsx`, `CartStatusPanel`, `OrderManagePanel`, `notifications.tsx`, `index.tsx`) |

Modifier l'un sans l'autre décale le contenu par rapport à la barre.
