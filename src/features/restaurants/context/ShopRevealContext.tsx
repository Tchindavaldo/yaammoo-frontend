import React from 'react';
import { Animated, Easing } from 'react-native';

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
 *
 * ── Synchro au PIXEL, pas seulement au `setState` ──
 *
 * `ready` suffit a faire basculer tout le monde dans le meme rendu React, mais
 * PAS a garantir que chaque vue peint sa premiere frame au meme instant :
 * l'avatar, chaque carte et leurs images sont des instances natives distinctes,
 * chacune avec son propre passage de composition. `onLoad` d'expo-image dit
 * « decodee », pas « affichee ». D'ou un decalage residuel de quelques frames,
 * invisible a l'oeil nu mais net au ralenti, et different a chaque ouverture.
 *
 * Deux approches ont echoue parce qu'elles restaient probabilistes : un
 * `requestAnimationFrame` par composant (callbacks independants, aucune raison
 * de tomber ensemble) puis un delai fixe devine avant la bascule (on ne fait
 * que parier sur la duree de composition).
 *
 * `revealAnim` regle le probleme par construction. C'est UNE valeur animee,
 * partagee par tout le groupe, jouee sur le driver NATIF : une frame
 * d'animation met a jour toutes les vues qui y sont liees dans la meme
 * operation du thread UI. L'opacite de l'avatar et celle de chaque carte sont
 * donc rigoureusement egales a chaque frame — quel que soit l'instant ou leur
 * bitmap respectif a fini de compositer. On ne synchronise plus des evenements,
 * on partage un etat.
 */
interface ShopRevealValue {
  /** `true` quand toutes les images inscrites sont resolues (chargees ou en echec). */
  ready: boolean;
  /**
   * Progression du fondu d'apparition du groupe, 0 → 1. A brancher sur
   * l'opacite du contenu reel, et en inverse sur celle du squelette.
   */
  revealAnim: Animated.Value;
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

/**
 * Duree du fondu croise squelette → contenu. Ce n'est PAS un delai de
 * synchronisation (celle-ci est garantie par le partage de `revealAnim`) :
 * juste la douceur de l'apparition.
 */
export const REVEAL_MS = 220;

export const ShopRevealProvider: React.FC<{
  children: React.ReactNode;
  /**
   * URLs que le groupe doit attendre, DECLAREES A L'AVANCE par le parent qui
   * connait les donnees.
   *
   * ⚠️ Indispensable quand les membres du groupe ne montent pas tous dans le
   * meme commit React. C'est le cas sous une `FlatList` : elle monte son
   * `ListHeaderComponent` (la banniere) d'abord, ses cellules (les boutiques)
   * ensuite. Le groupe se scellait donc en ne connaissant que la banniere ; elle
   * se resolvait, le groupe partait, et la boutique s'inscrivait trop tard —
   * exactement le symptome « la banniere sort en premier ».
   *
   * Inutile quand le provider et ses enfants sont rendus ensemble (un provider
   * par boutique, pose par `DesignRouter`) : l'inscription pendant le rendu
   * suffit alors.
   */
  expect?: (string | null | undefined)[];
}> = ({ children, expect }) => {
  const pendingRef = React.useRef<Set<string>>(new Set());
  const knownRef = React.useRef<Set<string>>(new Set());

  // Pre-inscription au tout premier rendu, avant que le moindre enfant n'ait
  // pu monter : le groupe ne peut donc plus se croire complet trop tot.
  const seededRef = React.useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    expect?.forEach((uri) => {
      if (!uri) return;
      knownRef.current.add(uri);
      pendingRef.current.add(uri);
    });
  }
  const [ready, setReady] = React.useState(false);
  const readyRef = React.useRef(false);
  const revealAnim = React.useRef(new Animated.Value(0)).current;

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
    // Le contenu reel se monte a l'opacite 0 et monte a 1 pendant que le
    // squelette descend a 0 sur la MEME valeur : aucun trou entre les deux, et
    // toutes les vues du groupe suivent la meme rampe, a la frame pres.
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: REVEAL_MS,
      easing: Easing.out(Easing.ease),
      // Opacite seule : le driver natif la prend en charge, l'animation ne
      // depend donc plus du thread JS (ni de ses a-coups pendant le scroll).
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

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
    () => ({ ready, revealAnim, register, resolve }),
    [ready, revealAnim, register, resolve],
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
