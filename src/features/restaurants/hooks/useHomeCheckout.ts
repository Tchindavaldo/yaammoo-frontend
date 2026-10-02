import { useCallback, useRef, useState } from "react";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { useRequireName } from "@/src/features/profile/hooks/useProfileNameSheet";
import { Menu } from "@/src/types";
import { track } from "@/src/services/analytics/analytics";

type HomeToast = { message: string; type: "success" | "error" } | null;

/** Boutique et menu d'un menu du catalogue (champs du backend, hors type `Menu`). */
const idsOf = (menu: Menu | null) => {
  const m = menu as any;
  return {
    ...(m?.fastFoodId ? { fastFoodId: String(m.fastFoodId) } : {}),
    ...(m?.id ? { menuId: String(m.id) } : {}),
  };
};

/**
 * Commande depuis le home : menu choisi, visibilité du `CheckoutSheet`, envoi
 * de la commande et toast de résultat. L'écran rend la sheet et le toast.
 */
export const useHomeCheckout = () => {
  const { requireAuth } = useAuthGate();
  const requireName = useRequireName();
  const { addOrder } = useOrders();

  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [toast, setToast] = useState<HomeToast>(null);

  const handleMenuClick = (menu: Menu) => {
    track("menu_open", idsOf(menu));
    // Ouvrir le menu mène à la commande (CheckoutSheet = action liée au compte).
    // Pour un invité, on ouvre la sheet d'auth au lieu du checkout.
    // Nom / prenom manquant : la sheet dediee passe AVANT le checkout.
    requireAuth(() =>
      requireName(() => {
        setSelectedMenu(menu);
        setCheckoutVisible(true);
      }),
    );
  };

  // Le handler change a chaque rendu (il capture `requireAuth` et les setters),
  // mais `renderItem` doit rester stable. La ref donne le meilleur des deux :
  // une identite figee cote FlatList, toujours la derniere version a l'appel.
  const handleMenuClickRef = useRef(handleMenuClick);
  handleMenuClickRef.current = handleMenuClick;

  // ⚠️ Identite figee : passer `(menu) => ref.current(menu)` recreait une
  // lambda par cellule et par rendu, ce qui aurait annule le `memo` de
  // `DesignRouter`.
  const onMenuClickStable = useCallback(
    (menu: Menu) => handleMenuClickRef.current(menu),
    [],
  );

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleConfirmOrder = async (order: any) => {
    try {
      const result = await addOrder(order);
      if (result.success) {
        // La commande payee passe par `checkout_start` / `payment_result`.
        if (order.status !== "pending") {
          track("add_to_cart", {
            ...idsOf(selectedMenu),
            data: Number.isFinite(order.quantity) ? { quantity: order.quantity } : {},
          });
        }
        showToast(
          order.status === "pending"
            ? "Commande envoyée au marchand !"
            : "Article ajouté au panier !",
          "success",
        );
        return true;
      } else {
        showToast(result.message || "Une erreur est survenue.", "error");
        return false;
      }
    } catch {
      showToast("Une erreur est survenue.", "error");
      return false;
    }
  };

  return {
    selectedMenu,
    checkoutVisible,
    closeCheckout: () => setCheckoutVisible(false),
    toast,
    hideToast: () => setToast(null),
    onMenuClickStable,
    handleConfirmOrder,
  };
};
