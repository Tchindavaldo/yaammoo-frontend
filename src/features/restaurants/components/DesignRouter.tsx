import React from 'react';
import { FastFood, Menu } from '@/src/types';
import { Design1 } from './designs/Design1';
import { Design2 } from './designs/Design2';
import { Design3 } from './designs/Design3';
import { Design4 } from './designs/Design4';
import { Design5 } from './designs/Design5';
import { Design6 } from './designs/Design6';

interface DesignRouterProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const DesignRouter: React.FC<DesignRouterProps> = ({ fastFood, onMenuClick }) => {
  const index = fastFood.designIndex ?? 0;

  // Mapping séquentiel des nouveaux noms :
  // 0 -> Design1 (Special Offers)
  // 1 -> Design2 (Rice & Salad)
  // 2 -> Design3 (Popular Menu)
  // 3 -> Design4 (Pizza Specials)
  // 4 -> Design5 (Featured Selection)
  // 5 -> Design6 (Flash Deals)
  
  switch (index % 6) {
    case 0:
      return <Design3 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 1:
      return <Design2 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 2:
      return <Design4 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 3:
      return <Design4 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 4:
      return <Design5 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 5:
      return <Design6 fastFood={fastFood} onMenuClick={onMenuClick} />;
    default:
      return <Design1 fastFood={fastFood} onMenuClick={onMenuClick} />;
  }
};
