import { useFastFoodContext } from "../context/FastFoodContext";

export const useFastFoods = () => {
    const context = useFastFoodContext();

    const filteredFastFoods = context.fastFoods.filter(ff => {
        const fastFoodName = ff.nom || (ff as any).name || '';
        return fastFoodName.toLowerCase().includes(context.searchQuery.toLowerCase());
    });

    return {
        ...context,
        fastFoods: filteredFastFoods,
    };
};
