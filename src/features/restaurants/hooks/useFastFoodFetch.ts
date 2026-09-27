import { Config } from "@/src/api/config";
import { trackBootStep } from "@/src/services/bootTelemetry";
import { getOptionalIdToken } from "@/src/services/idToken";
import type { AppBanner, FastFood } from "@/src/types";
import { sinceBoot } from "@/src/utils/bootClock";
import axios from "axios";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { MAX_SERVER_LIMIT } from "../utils/homeClientSettings";
import { normalizeFastFood } from "../utils/normalizeFastFood";
import type { FastFoodHomeSettings } from "./useFastFoodHomeSettings";
import type { FastFoodPagination } from "./useFastFoodPagination";

/**
 * Requetes du catalogue (`GET /fastFood/all`), extraites de `FastFoodContext` :
 * `fetchPage` (premiere page, page suivante, recherche) et
 * `refreshLoadedSilently` (catch-up socket), plus l'etat porte par la reponse
 * (chargement, erreur, bannieres, mode review, garde-fou du splash).
 *
 * ⚠️ Les deux callbacks gardent une identite STABLE : ils ne dependent que de
 * refs et de setters. L'effet d'identite du contexte en depend : une nouvelle
 * reference relancerait la premiere page.
 */

/**
 * Delai au-dela duquel on entre dans la home sans le catalogue.
 *
 * `/fastFood/all` repond en ~1,5 s de façon stable (mesure : 5 appels
 * consecutifs, machine Fly.io maintenue eveillee). 12 s laissent donc huit fois
 * la marge : seul un vrai blocage declenche le garde-fou, jamais une reponse
 * simplement lente.
 */
const BOOT_GIVE_UP_MS = 12000;

interface Params {
  setFastFoods: Dispatch<SetStateAction<FastFood[]>>;
  pagination: FastFoodPagination;
  settings: FastFoodHomeSettings;
}

export function useFastFoodFetch({ setFastFoods, pagination, settings }: Params) {
  const {
    fastFoodsLenRef,
    pumpLenRef,
    cursorRef,
    firstPageCursorRef,
    pendingCursorRef,
    resetSeqRef,
    pageFetchRef,
    pendingPageRef,
    firstPageSizeRef,
    staggerQueueRef,
    setLoadingMore,
    setHasMore,
    pumpStaggeredAppend,
  } = pagination;
  const { homeSettingsRef, storedSettingsRef, applyServerSettings } = settings;
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  /**
   * Garde-fou du splash : on entre dans la home au bout de `BOOT_GIVE_UP_MS`,
   * meme si le catalogue n'a pas repondu.
   *
   * ⚠️ `hasLoadedOnce` pilote la revelation de (tabs) et ne passait a `true`
   * qu'au `finally` du premier fetch. Or cette requete peut ne JAMAIS revenir :
   * aucun timeout axios (volontaire, cf. `setupHttp`), et le backend est
   * heberge sur Fly.io, qui endort les machines — un demarrage a froid de
   * `/fastFood/all` a ete mesure a 15-20 s, contre 1,3 s a chaud. L'app restait
   * bloquee sur le splash pendant tout ce temps, et indefiniment si la reponse
   * ne venait pas.
   *
   * Mieux vaut la home avec son message d'erreur — l'utilisateur voit l'app,
   * peut naviguer, et la reponse tardive remplit la liste quand elle arrive.
   */
  useEffect(() => {
    if (hasLoadedOnce) return;
    const t = setTimeout(() => {
      console.log("[boot] catalogue sans reponse, on entre dans la home");
      setError("Connection internet indisponible, vérifiez votre réseau");
      setHasLoadedOnce(true);
    }, BOOT_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [hasLoadedOnce]);
  /**
   * Numéro de la requête en cours. Une réponse dont le numéro n'est plus le
   * dernier est ignorée : sans ça, une recherche lente écraserait le résultat
   * d'une frappe plus récente, et un `loadMore` en vol viendrait polluer une
   * liste déjà réinitialisée.
   */
  const runIdRef = useRef(0);
  /**
   * Premiere page du lancement deja mesuree (log `[boot]` + `trackBootStep`).
   *
   * ⚠️ Ref et non `hasLoadedOnce` : lu dans `fetchPage`, l'etat restait fige a
   * `false` par la closure, et la mesure repartait a chaque refresh ou
   * recherche. Il ne convient pas non plus : le garde-fou du splash le passe a
   * `true` au bout de `BOOT_GIVE_UP_MS`, et une reponse tardive (demarrage a
   * froid Fly.io) ne serait alors jamais mesuree.
   */
  const bootMeasuredRef = useRef(false);
  const [appleReviewMode, setAppleReviewMode] = useState(false);
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Double l'etat : le callback de retour reseau est pose UNE fois et lirait
  // sinon un `error` fige par la closure.
  const errorRef = useRef<string | null>(null);
  errorRef.current = error;

  /**
   * Charge UNE page de boutiques.
   *
   * @param cursor `undefined` = première page (remplace la liste) ; sinon on
   *   concatène à l'existant.
   * @param q recherche par nom, résolue par le serveur.
   *
   * ⚠️ La recherche est SERVEUR et non locale : filtrer `fastFoods` côté client
   * ne verrait que les pages déjà chargées, donc une boutique du fond du
   * catalogue serait introuvable — une régression silencieuse.
   */
  const fetchPage = useCallback(async (cursor?: string, q?: string) => {
    const isFirstPage = !cursor;
    /**
     * Numero de troncature au moment du DEPART de cette requete.
     *
     * ⚠️ Un `loadMore` peut etre encore en vol quand l'utilisateur remonte en
     * haut : `resetToFirstPage()` tronque la liste, mais n'annule pas la
     * requete. Sa reponse arrivait ensuite et concatenait sa page aux boutiques
     * conservees — on rechargeait donc exactement ce qu'on venait de retirer,
     * avec la pause du reseau et un ordre qui ne correspondait plus a la
     * position de l'utilisateur. On compare donc ce numero a l'arrivee.
     */
    const myReset = resetSeqRef.current;
    // ⚠️ Le compteur de génération sert UNIQUEMENT à la recherche : empêcher
    // qu'une frappe lente écrase le résultat d'une frappe plus récente. Il ne
    // doit PAS arbitrer entre deux chargements normaux.
    //
    // Au boot, l'effet d'identité part deux fois (`user = null`, puis la
    // session restaurée). Quand ce garde s'appliquait à tous les appels, le
    // second invalidait le premier : la réponse du premier était jetée sans
    // remplir la liste, et le home restait en chargement jusqu'au second
    // aller-retour. C'était la latence ressentie en cliquant « Plus tard ».
    //
    // Une liste remplie par un fetch « périmé » n'est pas un problème : le
    // fetch suivant la remplacera. Une liste VIDE, elle, bloque l'affichage.
    const myRun = isFirstPage ? ++runIdRef.current : runIdRef.current;
    /** Seule une recherche a un résultat à protéger d'une réponse tardive. */
    const guarded = !!q;
    const startedAt = Date.now();
    try {
      // SONDE [ROW] : un fetch premiere page hors boot = remplacement brutal
      // de la liste (meme effet qu'une troncature). A retirer avec la sonde.
      if (isFirstPage) console.log(`[ROW] FETCH-P1 q=${q ?? ""}`);
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      // Route PUBLIQUE mais à auth OPTIONNELLE : sans Bearer, le backend ne sait
      // pas quel user demande et renvoie `deliveryOffer: null` sur TOUS les
      // fastfoods — silencieusement, sans erreur HTTP. Le token est donc envoyé
      // dès qu'un user est connecté, pour que ses bonus livraison ARMÉS soient
      // résolus. Visiteur anonyme (ou token indisponible) : appel sans header,
      // la route continue de répondre normalement.
      const idToken = await getOptionalIdToken();
      // Premiere page : taille gardee au lancement precedent (lecture locale,
      // deja finie en general, Firebase tranche bien apres).
      if (isFirstPage && storedSettingsRef.current) {
        await storedSettingsRef.current;
      }
      const response = await axios.get(`${Config.apiUrl}/fastFood/all`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        params: {
          limit: homeSettingsRef.current.pageSize,
          ...(cursor ? { cursor } : {}),
          ...(q ? { q } : {}),
        },
      });

      // Réponse d'une recherche périmée : l'appliquer ferait réapparaître les
      // résultats d'une frappe précédente. Hors recherche, on applique
      // toujours — voir l'explication sur `guarded` plus haut.
      if (guarded && myRun !== runIdRef.current) return;

      // ⚠️ Page suivante devenue caduque : un `resetToFirstPage()` est survenu
      // pendant le vol. Concatener cette page ARAJOUTERAIT exactement les
      // boutiques qu'on vient de retirer, et `cursorRef` (remis a la fin de la
      // premiere page par le reset) serait ecrase par le curseur de cette
      // reponse — la pagination repartirait du mauvais endroit. On jette donc
      // AVANT toute ecriture. Le `finally` n'eteint plus `loadingMore` pour ce
      // cas : le reset l'a deja eteint, et le prochain `loadMore` est libre.
      if (!isFirstPage && myReset !== resetSeqRef.current) return;

      // Flag review Apple porté par la réponse (défaut false si absent).
      setAppleReviewMode(response.data?.appleReviewMode === true);

      // Bannières : servies uniquement sur la première page par le backend.
      // Sur un `loadMore` le tableau est vide — ne pas écraser celles en place.
      if (isFirstPage) {
        setBanners(
          Array.isArray(response.data?.banners) ? response.data.banners : [],
        );
        // Reglages d'affichage : premiere page seulement, comme les bannieres.
        // Ils valent pour les pages SUIVANTES (celle-ci est deja partie).
        applyServerSettings(response.data?.clientSettings);
      }

      const next = response.data?.nextCursor ?? null;
      if (isFirstPage) {
        cursorRef.current = next;
        firstPageCursorRef.current = next;
        setHasMore(!!next);
      } else {
        // Page suivante : curseur + `hasMore` appliques a l'INSERTION reelle
        // (`pumpStaggeredAppend`), pas ici. Sinon un HOLD afficherait la fin
        // de catalogue avant que la page en attente soit inseree.
        pendingCursorRef.current = next;
      }

      if (response.data && response.data.data) {
        const raw: any[] = response.data.data;
        if (isFirstPage) {
          pageFetchRef.current = 1;
          const data = raw.map((item, index) =>
            normalizeFastFood(item, index % 6),
          );
          pumpLenRef.current = data.length;
          firstPageSizeRef.current = data.length;
          setFastFoods(data);
        } else {
          // La page s'insere ENTIERE D'UN COUP, mais seulement au bas strict
          // (voir `pumpStaggeredAppend`) : jamais en plein defilement, jamais
          // rangee par rangee.
          //
          // ⚠️ `pumpLenRef`, pas `fastFoodsLenRef` : celui-ci ne suit que les
          // rendus valides, perime des qu'on scrolle vite (page N inseree mais
          // pas encore commitee quand la N+1 calcule sa base). On compte au
          // moment ou on empile : la base reste exacte meme en fling.
          const base = pumpLenRef.current + staggerQueueRef.current.length;
          const batch = raw
            .filter((item) => item?.id)
            .map((item, i) => normalizeFastFood(item, (base + i) % 6));
          pumpLenRef.current += batch.length;
          staggerQueueRef.current.push(...batch);
          // Page vide : rien ne s'insera, on applique le curseur tout de suite
          // puis on libere le fetch suivant et on eteint le loader (aucun
          // layout a attendre).
          if (batch.length === 0) {
            if (pendingCursorRef.current !== undefined) {
              cursorRef.current = pendingCursorRef.current;
              setHasMore(!!pendingCursorRef.current);
              pendingCursorRef.current = undefined;
            }
            pendingPageRef.current = false;
            setLoadingMore(false);
          }
          console.log(
            `[ROW] PAGE-ARRIVEE +${batch.length} (file=${staggerQueueRef.current.length})`,
          );
          pumpStaggeredAppend();
        }
      }
    } catch (err: any) {
      if (guarded && myRun !== runIdRef.current) return;
      console.error("Error fetching fast foods:", err);
      setError("Connection internet indisponible, vérifiez votre réseau");
      // Echec d'une page suivante : rien ne s'insera, le prochain bas
      // pourra reessayer au lieu de rester verrouille. Le loader s'eteint
      // tout de suite (aucun layout a attendre).
      if (!isFirstPage) {
        pendingPageRef.current = false;
        if (myReset === resetSeqRef.current) setLoadingMore(false);
      }
    } finally {
      // Mesure du chargement qui LEVE LE SPLASH : c'est le chemin critique du
      // demarrage, la seule requete dont l'affichage depend vraiment.
      if (isFirstPage && !bootMeasuredRef.current) {
        bootMeasuredRef.current = true;
        const elapsed = Date.now() - startedAt;
        console.log(
          `[boot t=${sinceBoot()}s] /fastFood/all en ${(elapsed / 1000).toFixed(2)}s`,
        );
        trackBootStep("catalogue", elapsed);
      }

      // `hasLoadedOnce` pilote la revelation de (tabs) : une reponse recue,
      // quelle qu'elle soit, prouve que le chargement a eu lieu.
      setHasLoadedOnce(true);

      // Chaque appel n'eteint QUE son propre indicateur, sinon un `loadMore`
      // masquerait une premiere page encore en vol.
      //
      // ⚠️ Une page suivante devenue caduque (reset pendant son vol) ne touche
      // plus a `loadingMore` : le reset l'a deja eteint pour faire disparaitre
      // le loader tout de suite, et un `loadMore` legitime a pu repartir
      // depuis. L'eteindre ici masquerait CE chargement-la.
      //
      // ⚠️ Le loader d'une page suivante ne s'eteint PAS a la reponse : il
      // reste visible pendant l'attente (HOLD) et l'insertion, jusqu'au layout
      // (`notifyPageLaidOut`). Sinon l'utilisateur ne verrait rien entre la
      // fin du fetch et l'apparition des cartes.
      if (isFirstPage) setLoading(false);
    }
  }, [
    applyServerSettings,
    setFastFoods,
    setLoadingMore,
    setHasMore,
    pumpStaggeredAppend,
    storedSettingsRef,
    homeSettingsRef,
    resetSeqRef,
    cursorRef,
    firstPageCursorRef,
    pendingCursorRef,
    pageFetchRef,
    pumpLenRef,
    firstPageSizeRef,
    staggerQueueRef,
    pendingPageRef,
  ]);

  /**
   * Rafraichit SILENCIEUSEMENT les boutiques deja chargees, sans toucher ni au
   * loader, ni au curseur, ni a l'ordre de la liste.
   *
   * ⚠️ Volontairement distinct de `refresh()` : celui-ci repart de la premiere
   * page, ce qui allume le loader plein ecran et TRONQUE la liste — l'utilisateur
   * revenant dans l'app perdrait sa position de scroll et verrait un ecran de
   * chargement sur une liste deja affichee.
   *
   * Ici on remplace chaque boutique par sa version fraiche, a la meme position.
   * Une boutique absente de la reponse est CONSERVEE : elle appartient peut-etre
   * a une page au-dela de `limit`, et la retirer la ferait disparaitre de l'ecran.
   *
   * Appele par le catch-up socket (retour au premier plan, reconnexion) : les
   * events du catalogue sont des broadcasts globaux que le backend ne rejoue
   * jamais, donc prix et menus modifies pendant l'absence seraient perdus.
   */
  const refreshLoadedSilently = useCallback(async () => {
    const loadedCount = fastFoodsLenRef.current;
    if (loadedCount === 0) return;

    try {
      const idToken = await getOptionalIdToken();
      const headers = idToken
        ? { Authorization: `Bearer ${idToken}` }
        : undefined;

      // ⚠️ Le backend PLAFONNE `limit` a 50. Une seule requete laisserait donc
      // les boutiques au-dela du 50e avec leurs anciens prix — silencieusement.
      // On enchaine les pages par curseur jusqu'a couvrir tout ce qui est
      // affiche, par 50 et non par la taille de page du home : a 3 par page,
      // un catalogue de 100 boutiques demanderait 34 allers-retours au lieu de 2.
      const fresh = new Map<string, any>();
      let cursor: string | null = null;

      while (fresh.size < loadedCount) {
        const response: any = await axios.get(`${Config.apiUrl}/fastFood/all`, {
          headers,
          params: {
            limit: Math.min(loadedCount - fresh.size, MAX_SERVER_LIMIT),
            ...(cursor ? { cursor } : {}),
          },
        });

        // Au login invite → connecte, c'est ce rafraichissement qui remplace le
        // fetch premiere page : le flag review doit suivre le compte connecte,
        // les reglages d'affichage aussi.
        if (!cursor) {
          setAppleReviewMode(response.data?.appleReviewMode === true);
          applyServerSettings(response.data?.clientSettings);
        }

        const raw: any[] = response.data?.data ?? [];
        for (const item of raw) {
          if (item?.id) fresh.set(item.id, item);
        }

        cursor = response.data?.nextCursor ?? null;
        // Fin de catalogue, ou page vide : insister bouclerait a l'infini.
        if (!cursor || raw.length === 0) break;
      }

      if (fresh.size === 0) return;

      setFastFoods((prev) =>
        prev.map((ff, index) => {
          const updated = fresh.get(ff.id);
          // `designIndex` suit la POSITION dans la liste, pas la boutique : on
          // le recalcule ici, sinon une boutique gardee changerait d'apparence.
          // `listKey` conserve : la perdre changerait la cle de ligne et
          // remonterait la cellule.
          return updated
            ? { ...normalizeFastFood(updated, index % 6), listKey: (ff as any).listKey }
            : ff;
        }),
      );
    } catch {
      // Rattrapage silencieux : un echec ne doit ni afficher d'erreur, ni
      // remplacer les donnees en place. Le prochain retour reessaiera.
    }
  }, [applyServerSettings, setFastFoods, fastFoodsLenRef]);

  return {
    loading,
    setLoading,
    hasLoadedOnce,
    appleReviewMode,
    banners,
    setBanners,
    error,
    setError,
    errorRef,
    fetchPage,
    refreshLoadedSilently,
  };
}
