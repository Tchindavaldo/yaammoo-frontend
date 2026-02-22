import { Users, UsersInfos, Commande, Menu, Embalage, Boisson, Livraison } from '@/src/types';

export const userToJSON = (user: Users) => {
    return {
        infos: { ...user.infos },
        isMarchand: user.isMarchand,
        statistique: user.statistique,
        commande: user.cmd.map(item => ({
            ...item,
            menu: { ...item.menu },
            embalage: item.embalage.map(e => ({ ...e })),
            boisson: { ...item.boisson },
            livraison: { ...item.livraison },
        })),
    };
};

export const jsonToUser = (data: any): Users => {
    const infos = new UsersInfos(
        data.infos.nom,
        data.infos.prenom,
        data.infos.age,
        data.infos.numero,
        data.infos.uid,
        data.infos.email,
        data.infos.password
    );

    const commande: Commande[] = (data.commande || []).map((item: any) => {
        const menu = new Menu(
            item.menu.titre,
            item.menu.prix1,
            item.menu.prix2,
            item.menu.prix3,
            item.menu.optionPrix1,
            item.menu.optionPrix2,
            item.menu.optionPrix3,
            item.menu.image,
            item.menu.disponibilite
        );

        return new Commande(
            item.uidUser,
            item.idCmd,
            item.idFastFood,
            menu,
            item.quantite,
            item.embalage.map((e: any) => new Embalage(e.type, e.prix)),
            new Boisson(item.boisson.type, item.boisson.prix),
            new Livraison(item.livraison.statut, item.livraison.prix),
            item.prixTotal,
            item.staut,
            item.isBuy,
            item.ispending
        );
    });

    return new Users(infos, data.isMarchand, data.statistique, commande, data.fastFoodId);
};
