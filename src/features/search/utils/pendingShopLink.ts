// Memorise l'id de boutique d'un lien `yaammoo://shop/<id>` (QR scanne depuis
// l'appareil photo) quand l'app demarre a froid : la route est alors protegee
// (auth pas encore resolue) et expo-router la perd. Ecrit par +native-intent,
// consomme par le layout des onglets une fois connecte.
let pending: string | null = null;

// Vrai pour toute la vie du process si l'app a ete lancee par un lien QR.
let linkLaunch = false;
export const isLinkLaunch = () => linkLaunch;

export const setPendingShopLink = (id: string | null) => {
  pending = id;
  if (id) linkLaunch = true;
};

export const hasPendingShopLink = (): boolean => pending !== null;

export const takePendingShopLink = (): string | null => {
  const id = pending;
  pending = null;
  opened = false;
  return id;
};

// Le layout des onglets ouvre la recherche SANS vider l'id : le home sait ainsi
// qu'il ne doit pas lever le splash (la recherche le leve et vide l'id).
let opened = false;
export const claimPendingShopLinkForOpen = (): string | null => {
  if (pending === null || opened) return null;
  opened = true;
  return pending;
};

/** Extrait l'id d'un chemin `/shop/<id>` ou `yaammoo://shop/<id>`, sinon null. */
export const shopIdFromPath = (path: string): string | null => {
  const m = /(?:^|\/)shop\/([A-Za-z0-9_-]{6,})\/?(?:[?#].*)?$/.exec(path);
  return m ? m[1] : null;
};

// Splash au demarrage a froid par QR : on ne le leve que quand le home ET la
// recherche sont poses (sinon la page d'auth, encore en transition, s'entrevoit).
let homeReady = false;
let searchReady = false;
export const releaseSplashForLink = (who: "home" | "search", hide: () => void) => {
  if (who === "home") homeReady = true;
  else searchReady = true;
  if (homeReady && searchReady) hide();
};
