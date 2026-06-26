import { useFastFoodContext } from "../context/FastFoodContext";

export const useFastFoods = () => {
    const context = useFastFoodContext();

    const filteredFastFoods = context.fastFoods.filter(ff => {
        // On n'affiche pas un fast food sans aucun plat (menu vide).
        const menus = Array.isArray((ff as any).menu) ? (ff as any).menu : [];
        if (menus.length === 0) return false;

        const fastFoodName = ff.nom || (ff as any).name || '';
        return fastFoodName.toLowerCase().includes(context.searchQuery.toLowerCase());
    });

    return {
        ...context,
        fastFoods: filteredFastFoods,
    };
};
