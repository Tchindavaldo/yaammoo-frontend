import React from 'react';

/**
 * Revelation GROUPEE d'une boutique du home.
 *
 * ⚠️ Pourquoi ce contexte existe : chaque `DesignItem` portait son propre etat
 * de chargement et levait son squelette des que SON image etait prete. Les
 * cartes d'une meme rangee se remplissaient donc l'une apres l'autre, et le
 * `MerchantHeader` (avatar + nom + etoiles) sortait de son cote — la boutique
 * apparaissait en morceaux, dans l'ordre aleatoire des telechargements.
 *
 * Ici l'etat appartient a la BOUTIQUE : le header et toutes ses cartes lisent le
 * meme booleen, et basculent donc au meme instant.
 *
 * Le comptage se fait par URL et non par nombre d'images : une meme URL peut
 * apparaitre sur plusieurs cartes (expo-image dedoublonne alors la requete et
 * ne declenche qu'un `onLoad` par instance montee), et une inscription en
 * double figerait le compte a jamais.
 */
interface ShopRevealValue {
  /** `true` quand toutes les images inscrites sont resolues (chargees ou en echec). */
  ready: boolean;
  /** Declare une image a attendre. Sans effet si l'URL est deja connue. */
  register: (uri: string) => void;
  /** Signale une image resolue — succes comme echec. */
  resolve: (uri: string) => void;
}

const ShopRevealContext = React.createContext<ShopRevealValue | null>(null);

/**
 * Delai maximal avant revelation forcee. Une image qui ne repond ni par
 * `onLoad` ni par `onError` (serveur muet, requete suspendue) ne doit pas figer
 * la boutique sur son squelette indefiniment.
 */
const MAX_WAIT_MS = 8000;

export const ShopRevealProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const pendingRef = React.useRef<Set<string>>(new Set());
  const knownRef = React.useRef<Set<string>>(new Set());
  const [ready, setReady] = React.useState(false);
  const readyRef = React.useRef(false);

  // ⚠️ Fenetre d'inscription. Le premier `onLoad` peut arriver avant que les
  // cartes suivantes n'aient eu le temps de s'inscrire : a cet instant le set
  // des images en attente est vide, et la boutique se revelerait alors qu'il
  // reste des images en route. On n'evalue donc rien avant la fin du rendu
  // initial, quand toutes les inscriptions sont faites.
  const sealedRef = React.useRef(false);

  const finish = React.useCallback(() => {
    if (readyRef.current) return;
    readyRef.current = true;
    setReady(true);
  }, []);

  const evaluate = React.useCallback(() => {
    if (!sealedRef.current) return;
    if (pendingRef.current.size === 0) finish();
  }, [finish]);

  React.useEffect(() => {
    // Fin du rendu initial : toutes les cartes de la rangee se sont inscrites.
    sealedRef.current = true;
    evaluate();

    const timer = setTimeout(finish, MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, [evaluate, finish]);

  const register = React.useCallback((uri: string) => {
    if (readyRef.current) return;
    if (knownRef.current.has(uri)) return;
    knownRef.current.add(uri);
    pendingRef.current.add(uri);
  }, []);

  const resolve = React.useCallback(
    (uri: string) => {
      pendingRef.current.delete(uri);
      evaluate();
    },
    [evaluate],
  );

  const value = React.useMemo(
    () => ({ ready, register, resolve }),
    [ready, register, resolve],
  );

  return (
    <ShopRevealContext.Provider value={value}>
      {children}
    </ShopRevealContext.Provider>
  );
};

/**
 * Etat de revelation de la boutique englobante.
 *
 * Renvoie `null` hors d'un `ShopRevealProvider` : les appelants retombent alors
 * sur leur ancien comportement (chaque image se revele seule), ce qui garde
 * `DesignItem` et `MerchantHeader` utilisables isolement.
 */
export const useShopReveal = () => React.useContext(ShopRevealContext);
