/**
 * Horloge du demarrage : temps ecoule depuis le chargement du bundle.
 *
 * ⚠️ Sans repere commun, un log « en 2.85s » ne dit pas QUAND la requete est
 * partie : impossible de distinguer ce qui s'execute sous le splash de ce qui
 * part une fois l'app affichee. Avec `t=`, l'ordre reel se lit d'un coup d'oeil.
 */
const BOOT_AT = Date.now();

/** Temps depuis le boot, en secondes. */
export const sinceBoot = () => ((Date.now() - BOOT_AT) / 1000).toFixed(2);
