import { showToast } from "@/src/services/globalToast";
import { t as tr } from "@/src/i18n";
import { useMenuPriceCheck } from "./useMenuPricePreview";

/**
 * Actions de l'étape prix du sheet menu : bouton ✓ (un prix) et vérification
 * de tous les prix au bouton « Suivant ». Un refus = UN toast (une ligne par
 * prix refusé) + bascule sur l'onglet du premier prix refusé.
 */
export function menuPriceStepActions({
  priceCheck,
  selectedIdx,
  setSelectedIdx,
  setErrorFields,
  clearError,
}: {
  priceCheck: ReturnType<typeof useMenuPriceCheck>;
  selectedIdx: number;
  setSelectedIdx: (i: number) => void;
  setErrorFields: (f: string[]) => void;
  clearError: (f: string) => void;
}) {
  const validateSelected = async () => {
    const p = await priceCheck.checkOne(selectedIdx);
    if (!p) {
      showToast(tr("Impossible de vérifier le prix"), "error");
      return;
    }
    if (!p.accepted) {
      setErrorFields([`prix${selectedIdx}`]);
      showToast(p.message || tr("Prix non accepté"), "error");
    } else clearError(`prix${selectedIdx}`);
  };

  /** true = tous les prix acceptés, on peut passer à l'étape suivante. */
  const checkAllPrices = async (): Promise<boolean> => {
    const res = await priceCheck.checkAll();
    if (!res) {
      showToast(tr("Impossible de vérifier le prix"), "error");
      return false;
    }
    if (!res.ok) {
      setSelectedIdx(res.firstBad);
      setErrorFields([`prix${res.firstBad}`]);
      showToast(res.message || tr("Prix non accepté"), "error");
      return false;
    }
    return true;
  };

  return { validateSelected, checkAllPrices };
}
