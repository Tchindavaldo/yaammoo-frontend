import { BlurTargetView } from "expo-blur";
import React, {
  createContext,
  ReactNode,
  RefObject,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Platform, View, ViewProps } from "react-native";

/**
 * Flou Android (SDK 57) : cible du flou.
 *
 * `expo-blur` 57 ne floute sur Android que le contenu enveloppe dans un
 * `BlurTargetView` passe au `BlurView` via `blurTarget`. La bibliotheque native
 * interdit qu'un `BlurView` soit DANS la cible qu'il floute : le contenu a
 * flouter et le flou doivent etre freres.
 *
 * Usage, sur les trois OS (iOS/web : aucun effet, simple `View`) :
 *
 *   <BlurScope>
 *     <BlurTarget style={...}>{contenu derriere le flou}</BlurTarget>
 *     <Header />   // contient un AppBlurView : il floute la cible ci-dessus
 *   </BlurScope>
 *
 * - `BlurTarget` REMPLACE un `View` existant (memes props) : la mise en page ne
 *   change pas.
 * - Un `AppBlurView` place DANS un `BlurTarget` ne vise pas cette cible (son
 *   contexte est remis a null) : il lui faut son propre `BlurScope` imbrique,
 *   sinon il retombe sur son `fallbackStyle`.
 * - Plusieurs cibles dans une meme zone (onglets) : seule celle marquee
 *   `active` est floutee.
 */

type TargetRef = RefObject<View | null>;

interface ScopeValue {
  /** Cible actuellement floutee par les AppBlurView de la zone. */
  target: TargetRef | null;
  /** Une cible s'annonce active (ou se retire avec `null`). */
  setTarget: (ref: TargetRef | null) => void;
}

const BlurScopeContext = createContext<ScopeValue | null>(null);

/** Zone partagee par une cible et les flous qui la floutent. */
export function BlurScope({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<TargetRef | null>(null);
  return (
    <BlurScopeContext.Provider value={{ target, setTarget }}>
      {children}
    </BlurScopeContext.Provider>
  );
}

/**
 * Contenu a flouter. Drop-in d'un `View`.
 *
 * @param active `false` = cible presente mais pas floutee (ecran d'onglet non
 *   focalise). Defaut `true`.
 */
export function BlurTarget({
  active = true,
  children,
  ...props
}: ViewProps & { active?: boolean }) {
  const scope = useContext(BlurScopeContext);
  const ref = useRef<View>(null);
  const isAndroid = Platform.OS === "android";

  useEffect(() => {
    if (!isAndroid || !scope || !active) return;
    scope.setTarget(ref);
    return () => scope.setTarget(null);
    // `scope.setTarget` est stable (setState) : seul `active` compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAndroid, active]);

  if (!isAndroid || !scope) return <View {...props}>{children}</View>;

  return (
    <BlurTargetView {...props} ref={ref}>
      {/* Interdit par la lib : un flou DANS la cible ne la vise jamais. */}
      <BlurScopeContext.Provider value={null}>{children}</BlurScopeContext.Provider>
    </BlurTargetView>
  );
}

/** Cible floutee par un `AppBlurView` a cet endroit (null = aucune). */
export function useBlurTarget(): TargetRef | null {
  return useContext(BlurScopeContext)?.target ?? null;
}
