import React from "react";
import { MenuDraft } from "./MenuDraft.types";
import { MenuRecapDesign1 } from "./MenuRecapDesign1";

/**
 * Récapitulatif du menu en cours de création (lecture seule sur le draft).
 */
export const MenuRecap: React.FC<{ draft: MenuDraft }> = ({ draft }) => (
  <MenuRecapDesign1 draft={draft} />
);
