import React from 'react';
import { FastFood, Menu } from '@/src/types';
import { Design1 } from './designs/Design1';
import { Design2 } from './designs/Design2';
import { Design3 } from './designs/Design3';
import { Design4 } from './designs/Design4';

interface DesignRouterProps {
  fastFood: FastFood;
  onMenuClick: (menu: Menu) => void;
}

export const DesignRouter: React.FC<DesignRouterProps> = ({ fastFood, onMenuClick }) => {
  const index = fastFood.designIndex ?? 0;

  switch (index) {
    case 0:
      return <Design1 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 1:
      return <Design2 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 2:
      return <Design3 fastFood={fastFood} onMenuClick={onMenuClick} />;
    case 3:
      return <Design4 fastFood={fastFood} onMenuClick={onMenuClick} />;
    default:
      return <Design1 fastFood={fastFood} onMenuClick={onMenuClick} />;
  }
};
