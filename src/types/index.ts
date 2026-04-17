export class UsersInfos {
  constructor(
    public nom: string,
    public prenom: string,
    public age: number,
    public numero: number,
    public email: string,
    public password: string,
  ) { }
}

export class Embalage {
  constructor(
    public type: string,
    public prix: number,
  ) { }
}

export class Boisson {
  constructor(
    public type: string,
    public prix: number,
  ) { }
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
  ) { }
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
    public extra?: Array<{ name: string; status: boolean; prix?: number }>,
    public drink?: Array<{ name: string; status: boolean; prix?: number; quantite?: number }>,
  ) { }
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
  ) { }
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
  ) { }
}

export class FastFood {
  constructor(
    public id: string,
    public owner: Users,
    public menu: Menu[],
    public orders: Commande[],
    public stats: any,
    public nom: string,
    public image: string,
    public designIndex?: number,
  ) { }
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
  ) { }
}
