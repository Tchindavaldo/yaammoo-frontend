/**
 * Flags de la localisation (changeables par OTA). Au lancement, yaammoo ne
 * dessert que Banganté : ces flags règlent ce que voit un utilisateur ailleurs.
 */

/**
 * Bandeau « Localisation désactivée » du home (`HomeLocationBanner`) quand la
 * permission n'est pas accordée. false = jamais de bandeau.
 */
export const SHOW_LOCATION_BANNER = false;

/**
 * Pilule du header home (`useCurrentPlaceLabel`) : true = lieu réel
 * (« Quartier, Arrondissement ») partout, même hors de Banganté ; false = hors
 * de Banganté, « Banganté, Cameroun » (seule zone desservie).
 */
export const SHOW_PLACE_OUTSIDE_SERVICE_AREA = false;
