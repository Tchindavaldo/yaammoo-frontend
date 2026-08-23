import React from 'react';
import { FastFood, Menu } from '@/src/types';
import { Design1 } from './designs/Design1';
import { Design2 } from './designs/Design2';
import { Design3 } from './designs/Design3';
import { Design4 } from './designs/Design4';
import { Design5 } from './designs/Design5';
import { Design6 } from './designs/Design6';
import { Design7 } from './designs/Design7';
import { ShopRevealProvider } from '../context/ShopRevealContext';

interface DesignRouterProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
  /** Rang dans la liste. Seule la boutique 0 partage le groupe de la banniere. */
  index?: number;
}

const DesignRouterBase: React.FC<DesignRouterProps> = ({ fastFood, onMenuClick, index: listIndex = 0 }) => {
  const index = fastFood.designIndex ?? 0;

  // DIAGNOSTIC TEMPORAIRE — montage/demontage des cellules.
  //
  // ⚠️ La mesure de duree precedente etait FAUSSE : `t0` etait capture au rendu
  // et relu dans un effet execute bien plus tard, d'ou les « 42909ms ». On ne
  // mesure plus que ce qui est fiable : le nombre de rendus par cellule et les
  // montages. Le blocage reel du thread est mesure par la sonde `[JS]`.
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;

  React.useEffect(() => {
    if (__DEV__) console.log(`[CELL] MOUNT #${listIndex} ${fastFood.nom}`);
    return () => {
      if (__DEV__) console.log(`[CELL] UNMOUNT #${listIndex} ${fastFood.nom}`);
    };
  }, [listIndex, fastFood.nom]);

  // Un rendu = normal. Plusieurs rendus repetes sur une cellule immobile = le
  // vrai signal a chercher.
  if (__DEV__ && renderCountRef.current > 1) {
    console.log(`[CELL] re-rendu #${listIndex} (x${renderCountRef.current})`);
  }

  // Attache au menu cliqué les infos de livraison du fastfood parent — toutes
  // déjà présentes dans `GET /fastfood/all` (deliveryHours, orderLeadTime,
  // advanceDays, deliveryOffer). Évite un refetch `GET /fastfood/:id` côté
  // checkout (deliveryOffer n'y figure d'ailleurs PAS, seul le /all le porte).
  const handleMenuClick = (menu: Menu) => {
    const ff = fastFood as any;
    onMenuClick({
      ...menu,
      deliveryHours: ff.deliveryHours,
      orderLeadTime: ff.orderLeadTime,
      advanceDays: ff.advanceDays,
      deliveryOffer: ff.deliveryOffer ?? null,
    } as Menu);
  };

  // Mapping avec cycle : boucle sur les 6 designs
  // 0 → Design7, 1 → Design4, 2 → Design6, 3 → Design7, 4 → Design4, 5 → Design5
  // À partir de 6, cela recommence (6 → Design7, 7 → Design4, etc.)
  //
  // ⚠️ On selectionne le COMPOSANT, on n'instancie pas les 6 variantes. Le
  // tableau d'elements JSX d'avant en construisait six a chaque rendu pour n'en
  // afficher qu'une.
  const DESIGNS = [Design7, Design4, Design6, Design7, Design4, Design5];
  const Design = DESIGNS[index % DESIGNS.length];

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
  if (listIndex === 0) return design;

  // Plus bas dans la liste : un provider PAR boutique, independant du reste.
  return <ShopRevealProvider>{design}</ShopRevealProvider>;
};

/**
 * ⚠️ `memo` : derniere barriere contre les re-rendus en cascade. Meme avec des
 * props stables en amont, le home se re-rend a chaque agitation des contextes
 * voisins ; sans cette barriere, chaque rendu du parent reconstruisait toutes
 * les cartes visibles (BlurView, LinearGradient, Svg, ombres) et bloquait le
 * thread JS de 70 a 190 ms.
 */
export const DesignRouter = React.memo(DesignRouterBase);
