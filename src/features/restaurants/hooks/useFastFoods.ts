import { useFastFoodContext } from "../context/FastFoodContext";

export const useFastFoods = () => {
    const context = useFastFoodContext();

    // ⚠️ La recherche par nom n'est PLUS filtrée ici : elle est resolue par le
    // serveur (`?q=`). Avec la pagination, filtrer localement ne verrait que les
    // pages deja chargees — une boutique du fond du catalogue serait
    // introuvable alors qu'elle existe.
    //
    // Seul filtre conserve : les boutiques sans plat. Le backend les ecarte
    // deja (jointure interne), on garde la garde pour les boutiques arrivees
    // par socket, dont le payload peut ne pas porter de menus.
    const filteredFastFoods = context.fastFoods.filter(ff => {
        const menus = Array.isArray((ff as any).menu) ? (ff as any).menu : [];
        return menus.length > 0;
    });

    return {
        ...context,
        fastFoods: filteredFastFoods,
    };
};
