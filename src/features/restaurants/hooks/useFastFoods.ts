import { useMemo } from "react";
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
    //
    // ⚠️ `useMemo` OBLIGATOIRE — ne pas filtrer directement dans le corps du
    // hook. `.filter()` renvoie un TABLEAU NEUF a chaque appel : la `FlatList`
    // du home voyait donc des donnees « changees » a chacun de ses rendus, et
    // re-rendait toutes ses cellules visibles. Or le home se re-rend a chaque
    // agitation des contextes voisins (notifications, auth, socket) : d'ou des
    // vagues de re-rendus sur des cartes pourtant immobiles, et des blocages du
    // thread JS de 70 a 190 ms — la micro-saccade ressentie au scroll.
    const fastFoods = useMemo(
        () =>
            context.fastFoods.filter((ff) => {
                const menus = Array.isArray((ff as any).menu) ? (ff as any).menu : [];
                return menus.length > 0;
            }),
        [context.fastFoods],
    );

    // ⚠️ Meme raison pour l'objet retourne : `{...context}` en crée un neuf a
    // chaque rendu, ce qui invalide toute memoisation chez les consommateurs.
    return useMemo(
        () => ({ ...context, fastFoods }),
        [context, fastFoods],
    );
};
