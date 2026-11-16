import { DraftPrice } from "../recap-designs/MenuDraft.types";
import { t as tr } from "@/src/i18n";

export type MenuStep = "nameImage" | "prices" | "details" | "recap";

interface Input {
  step: MenuStep;
  nom: string;
  category: string;
  prices: DraftPrice[];
  uploadedCount: number;
  stock: string;
}

/** Contrôle de l'étape courante avant « Suivant » : message + champs fautifs. */
export const validateMenuStep = ({
  step,
  nom,
  category,
  prices,
  uploadedCount,
  stock,
}: Input): { message: string; fields: string[] } | null => {
  if (step === "nameImage") {
    if (!nom.trim()) return { message: tr("Le nom ne doit pas être vide"), fields: ["nom"] };
    if (!category.trim())
      return { message: tr("La catégorie ne doit pas être vide"), fields: ["category"] };
    // 3 photos réellement uploadées (URLs) ; en modification, déjà présentes.
    if (uploadedCount < 3)
      return { message: tr("Vous devez ajouter 3 photos du menu"), fields: ["images"] };
  }
  if (step === "prices") {
    // Chaque prix renseigné doit avoir sa description ; le 1er est obligatoire.
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      if (i === 0 && !p.price)
        return { message: tr("Le prix 1 ne doit pas être vide"), fields: ["prix0"] };
      if (p.price && !p.description.trim())
        return {
          message: tr("La description du prix {{a}} ne doit pas être vide", { a: i + 1 }),
          fields: [`desc${i}`],
        };
    }
  }
  if (step === "details" && (stock.trim() === "" || isNaN(Number(stock))))
    return { message: tr("Le stock du menu doit être un nombre"), fields: ["stock"] };
  return null;
};
