export class UsersInfos {
    constructor(
        public nom: string,
        public prenom: string,
        public age: number,
        public numero: number,
        public uid: string,
        public email: string,
        public password: string
    ) { }
}

export class Embalage {
    constructor(public type: string, public prix: number) { }
}

export class Boisson {
    constructor(public type: string, public prix: number) { }
}

export class Livraison {
    constructor(
        public statut: boolean,
        public prix: number,
        public type: 'express' | 'standard' | 'aucune' = 'aucune',
        public hour: string = '',
        public date: string = '',
        public address: string = ''
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
        public disponibilite: string
    ) { }
}

export class Commande {
    constructor(
        public uidUser: string,
        public idCmd: string,
        public idFastFood: string,
        public menu: Menu,
        public quantite: number,
        public embalage: Embalage[],
        public boisson: Boisson,
        public livraison: Livraison,
        public prixTotal: number,
        public staut: string,
        public isBuy: boolean,
        public ispending: boolean
    ) { }
}

export class Users {
    constructor(
        public infos: UsersInfos,
        public isMarchand: boolean,
        public statistique: number,
        public cmd: Commande[],
        public fastFoodId?: string
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
        public designIndex?: number
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
        public type: 'credit' | 'debit'
    ) { }
}
