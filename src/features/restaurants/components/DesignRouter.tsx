import React from 'react';
import { FastFood, Menu } from '@/src/types';
import { Design1 } from './designs/Design1';
import { Design2 } from './designs/Design2';
import { Design3 } from './designs/Design3';
import { Design4 } from './designs/Design4';
import { Design5 } from './designs/Design5';
import { Design6 } from './designs/Design6';
import { Design7 } from './designs/Design7';

interface DesignRouterProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const DesignRouter: React.FC<DesignRouterProps> = ({ fastFood, onMenuClick }) => {
  const index = fastFood.designIndex ?? 0;

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
  const designs = [
    <Design7 fastFood={fastFood} onMenuClick={handleMenuClick} />,
    <Design4 fastFood={fastFood} onMenuClick={handleMenuClick} />,
    <Design6 fastFood={fastFood} onMenuClick={handleMenuClick} />,
    <Design7 fastFood={fastFood} onMenuClick={handleMenuClick} />,
    <Design4 fastFood={fastFood} onMenuClick={handleMenuClick} />,
    <Design5 fastFood={fastFood} onMenuClick={handleMenuClick} />,
  ];

  return designs[index % designs.length];
};
