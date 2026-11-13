import { useEffect, useRef } from "react";
import { onNetworkRestored } from "@/src/services/network";

/**
 * Recharge les donnees d'un contexte au RETOUR de la connexion, avec son
 * loader / skeleton habituel.
 *
 * ⚠️ Sans cela, une app ouverte hors-ligne affichait « aucune commande »,
 * « aucune notification », panier vide… et y restait une fois le reseau revenu :
 * seule la home se rechargeait. `onNetworkRestored` ne se declenche qu'a la
 * transition hors-ligne → en ligne, pas a chaque bascule WiFi / 4G.
 *
 * `refetch` est lu via une ref : le dernier en date est appele, sans
 * re-abonnement a chaque rendu.
 */
export function useRefetchOnReconnect(refetch: () => unknown) {
  const ref = useRef(refetch);
  ref.current = refetch;
  useEffect(
    () =>
      onNetworkRestored(() => {
        try {
          void ref.current();
        } catch {
          // Un echec de rechargement ne doit pas casser l'abonnement.
        }
      }),
    [],
  );
}
