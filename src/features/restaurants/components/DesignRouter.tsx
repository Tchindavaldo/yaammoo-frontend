import React from 'react';
import { View } from 'react-native';
import { FastFood, Menu } from '@/src/types';
import { Design1 } from './designs/Design1';
import { Design2 } from './designs/Design2';
import { Design3 } from './designs/Design3';
import { Design4 } from './designs/Design4';
import { Design5 } from './designs/Design5';
import { Design7 } from './designs/Design7';
import { ShopRevealProvider } from '../context/ShopRevealContext';
import { PageRevealReporter } from '../context/PageRevealGate';
import { isPlaceholder } from '../utils/pagePlaceholders';
import { DesignNumber, designNumberFor } from '../utils/designCycle';

const DESIGN_COMPONENTS: Record<DesignNumber, typeof Design7> = {
  7: Design7,
  4: Design4,
  5: Design5,
};

interface DesignRouterProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
  /** Rang dans la liste. Seule la boutique 0 partage le groupe de la banniere. */
  index?: number;
}

const DesignRouterBase: React.FC<DesignRouterProps> = ({ fastFood, onMenuClick, index: listIndex = 0 }) => {
  const index = fastFood.designIndex ?? 0;

  // NOTE perf (mesure faite, ne pas refaire) : le montage d'une boutique coute
  // 43 a 109 ms de COMMIT sur appareil reel (iPhone), pour 0 ms de rendu JS. Le
  // cout est donc la creation des vues natives, pas le JavaScript. Il decroit
  // dans un meme lot (109 → 72 → 48) : le premier montage paie un amorçage
  // amorti par les suivants. Sans lien avec le nombre de menus (1 menu = 81 ms,
  // 5 menus = 50 ms). Rien a optimiser ici.

  // Attache au menu cliqué les infos de livraison du fastfood parent — toutes
  // déjà présentes dans `GET /fastfood/all` (deliveryHours, orderLeadTime,
  // advanceDays, deliveryOffer). Évite un refetch `GET /fastfood/:id` côté
  // checkout (deliveryOffer n'y figure d'ailleurs PAS, seul le /all le porte).
  const placeholder = isPlaceholder(fastFood);
  // SONDE [HB] (temporaire) : rendus de rangees par seconde.
  const hb = (globalThis as any).__hb;
  if (hb) placeholder ? hb.ph++ : hb.row++;

  const handleMenuClick = (menu: Menu) => {
    // Fantome : rien a commander.
    if (placeholder) return;
    const ff = fastFood as any;
    onMenuClick({
      ...menu,
      deliveryHours: ff.deliveryHours,
      orderLeadTime: ff.orderLeadTime,
      advanceDays: ff.advanceDays,
      deliveryOffer: ff.deliveryOffer ?? null,
      // Retrait boutique autorisé ou non (GET /fastfood/all) : gate la card
      // « Aucun » de l'onglet Livraison du checkout.
      pickupAllowed: ff.pickupAllowed,
    } as Menu);
  };

  // Cycle des designs : table UNIQUE dans `utils/designCycle.ts`, partagee avec
  // `getItemType` du home (pools de recyclage). Ne pas la redupliquer ici.
  //
  // ⚠️ On selectionne le COMPOSANT, on n'instancie pas toutes les variantes.
  const Design = DESIGN_COMPONENTS[designNumberFor(index)];

  const design = <Design fastFood={fastFood} onMenuClick={handleMenuClick} />;

  // ⚠️ La PREMIERE boutique n'ouvre pas son propre groupe : elle herite de celui
  // pose par la home, qu'elle partage avec la banniere. Les deux se revelent
  // donc a la meme frame, sur la meme valeur animee.
  //
  // ⚠️ UNE SEULE boutique dans ce groupe, jamais plus. Avec deux, la boutique 0
  // devait aussi attendre les images de la boutique 1 : c'est ce qui avait
  // rajoute de la latence a l'arrivee sur le home. Ici la boutique 0 n'attend
  // que ce qu'elle attendait deja ; seule la banniere patiente un peu plus, le
  // temps de sortir en meme temps qu'elle.
  //
  // ⚠️ STRUCTURE INVARIANTE — ne pas revenir a un `if (listIndex === 0) return
  // design;` suivi d'un provider dans l'autre cas. L'arbre dependait alors de la
  // POSITION : provider absent en tete, present ailleurs. Sous une liste qui
  // recycle (FlashList), une cellule change de position au cours de sa vie ; la
  // forme de l'arbre changeait avec elle et React demontait tout pour le
  // remonter — `REMONTAGE` a 150-165 ms en plein scroll, mesure par la sonde
  // `[ROW]`. Le provider est donc TOUJOURS monte ; seul son mode varie.
  return (
    <ShopRevealProvider
      passthrough={listIndex === 0}
      // Fantome de la page suivante : squelette tenu jusqu'a la vraie boutique.
      hold={placeholder}
      // Remise a zero seulement aux passages fantome <-> reel : entre deux
      // vraies boutiques recyclees, comportement inchange.
      resetKey={placeholder ? fastFood.id : "real"}
    >
      {/* ⚠️ Fantome NON TOUCHABLE. Sinon un doigt pose sur une carte fantome
          au moment du remplissage donnait le « responder » a une vue que le
          rebind remplace : il n'etait jamais relache, le ScrollView restait
          bloque (JS responder) et plus aucun appui ne passait, navbar
          comprise. Vue TOUJOURS presente (arbre invariant), seul le mode
          change. */}
      <View pointerEvents={placeholder ? "none" : "auto"}>{design}</View>
      {/* Signale la revelation au verrou de page du home (scroll fige tant
          que les boutiques inserees ne sont pas affichees). */}
      <PageRevealReporter id={fastFood.id} />
    </ShopRevealProvider>
  );
};

/**
 * ⚠️ `memo` : derniere barriere contre les re-rendus en cascade. Meme avec des
 * props stables en amont, le home se re-rend a chaque agitation des contextes
 * voisins ; sans cette barriere, chaque rendu du parent reconstruisait toutes
 * les cartes visibles (BlurView, LinearGradient, Svg, ombres) et bloquait le
 * thread JS de 70 a 190 ms.
 */
export const DesignRouter = React.memo(DesignRouterBase);
