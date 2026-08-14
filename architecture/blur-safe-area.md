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
`experimentalBlurMethod="dimezisBlurView"`. Or cette implémentation dépend de la
version d'Android :

| Version | Implémentation | Statut |
|---|---|---|
| Android 12+ (API 31+) | `RenderEffect`, accéléré GPU | Utilisable |
| Android < 12 | `RenderScriptBlur` | **Crash** |

Sous Android 12, la lib redessine tout l'arbre de vues dans un canvas logiciel
avant chaque frame. Cette seconde traversée entre en conflit avec la passe de
dessin du système sur les `ViewGroup` dont les enfants ont un `zIndex` : la liste
d'enfants pré-ordonnée est partagée entre les deux passes, l'une la vide pendant
que l'autre la parcourt. Résultat :

```
java.lang.IndexOutOfBoundsException: Index: 1, Size: 0
  android.view.ViewGroup.getAndVerifyPreorderedView
  eightbitlab.com.blurview.PreDrawBlurController.updateBlur
```

Le crash se déclenche dès qu'un contenu bouge derrière un BlurView — donc sur
toute liste qui scrolle sous un header ou une tab bar.

### Comportement

- **iOS** : flou natif (`UIVisualEffectView`), rien à configurer.
- **Android 12+** : `dimezisBlurView` activé automatiquement.
- **Android < 12** : flou désactivé, rendu en voile teinté.

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
