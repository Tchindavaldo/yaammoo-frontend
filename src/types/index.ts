export class UsersInfos {
  constructor(
    public nom: string,
    public prenom: string,
    public age: number,
    public numero: number,
    public email: string,
    public password: string,
  ) {}
}

export class Embalage {
  constructor(
    public type: string,
    public prix: number,
    // Prix brut (hors marge) fourni par le backend sur l'extra du menu,
    // renvoyé tel quel dans le payload order.
    public rawPrice?: number,
  ) {}
}

export class Boisson {
  constructor(
    public type: string,
    public prix: number,
    // Prix brut (hors marge) fourni par le backend sur la boisson du menu.
    public rawPrice?: number,
  ) {}
}

/**
 * Offre de livraison gratuite greffée par le backend sur chaque fastfood
 * (`GET /fastfood/all` et `GET /fastfood/:id`). Décrit si la livraison est
 * offerte, pour quelle raison (campagne plateforme ou bonus armé du user), et
 * par qui elle est couverte. `null` = aucune offre → livraison payante.
 */
export interface DeliveryOffer {
  active: boolean;
  reason: "campaign" | "bonus";
  coveredBy: "platform" | "fastfood";
  bonusId: string | null;
  bonusCode: string | null;
  bonusName: string | null;
  fastFoodId: string | null;
}

/**
 * Bannière publicitaire du carrousel home (`GET /fastfood/all` → `banners[]`).
 * `type='bonus'` → au clic on ouvre la sheet bonus ciblée par `targetId` ;
 * `type='none'` → pas d'action au clic.
 */
export interface AppBanner {
  id: string;
  title: string | null;
  imageUrl: string;
  type: "bonus" | "none";
  targetId: string | null;
  active: boolean;
  sortOrder: number;
}

export class Livraison {
  constructor(
    public statut: boolean,
    public prix: number,
    public type: "express" | "standard" | "aucune" = "aucune",
    public hour: string = "",
    public date: string = "",
    public address: string = "",
    public phone: string = "",
    public voiceNoteUri: string = "",
    public note: string = "",
    // Express : lieu + prix propres à la livraison express (indépendants de la période)
    public expressLieu: string = "",
    public expressPrix: number = 0,
    // Code bonus livraison (saisi par le user ou issu de l'offre détectée) —
    // envoyé tel quel à la racine du payload order sous `bonusCode`.
    public bonusCode: string | null = null,
  ) {}
}

export class Menu {
  constructor(
    public titre: string,
    public prix1: number,
    public prix2: number,
    public prix3: number,
    public optionPrix1: string,
    public optionPrix2: string,
    public optionPrix3: string,
    public image: string,
    public disponibilite: string,
    public images?: string[],
    public extra?: {
      name: string;
      status: boolean;
      prix?: number;
      rawPrice?: number;
    }[],
    public drink?: {
      name: string;
      status: boolean;
      prix?: number;
      quantite?: number;
      rawPrice?: number;
    }[],
    public stock?: number,
    // Prix bruts (hors marge) alignés sur prix1/prix2/prix3, aplatis depuis
    // `prices[].rawPrice` du backend.
    public rawPrice1?: number,
    public rawPrice2?: number,
    public rawPrice3?: number,
  ) {}
}

export class Commande {
  constructor(
    public userId: string,
    public id: string,
    public fastFoodId: string,
    public menu: any,
    public quantity: number,
    public extra: any[],
    public drink: any[],
    public delivery: any,
    public total: number,
    public status: string,
    public userData?: any,
    public createdAt?: string,
    public updatedAt?: string,
    public rank?: number,
    // Driver assigned to deliver this order (per-order delegation).
    public driverId?: string,
  ) {}
}

export class Users {
  constructor(
    public uid: string,
    public id: string,
    public infos: UsersInfos,
    public isMarchand: boolean,
    public statistique: number,
    public cmd: Commande[],
    public fastFoodId?: string,
    // Driver role: `driverId` identifies the driver; `isDriver` is derived
    // from its presence (like `isMarchand` from `fastFoodId`). Orders are
    // assigned per-order via `Commande.driverId`.
    public isDriver?: boolean,
    public driverId?: string,
  ) {}
}

export class FastFood {
  constructor(
    public id: string,
    public owner: Users,
    public menu: Menu[],
    public orders: Commande[],
    public stats: any,
    public nom: string,
    public name: string,
    public image: string,
    public designIndex?: number,
    public logo?: string,
    public coverImage?: string,
  ) {}
}

export class Transaction {
  constructor(
    public id: string,
    public userId: string,
    public amount: number,
    public name: string,
    public payBy: string,
    public createdAt: string,
    public type: "credit" | "debit",
  ) {}
}
