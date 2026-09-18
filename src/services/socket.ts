import { io, Socket } from 'socket.io-client';
import { Config } from '../api/config';
import { sinceBoot } from '../utils/bootClock';

class SocketService {
    private socket: Socket;
    private paymentHandler: ((data: any) => void) | null = null;
    /** Horodatage du dernier `connect()`, pour mesurer la duree d'etablissement. */
    private connectStartedAt: number | null = null;

    constructor() {
        this.socket = io(Config.apiUrl, {
            // ⚠️ `websocket` en TETE mais `polling` en repli. En forcant le seul
            // websocket, une coupure du lien (veille iOS, bascule wifi/4G, proxy
            // qui coupe l'upgrade) ne laisse AUCUNE autre voie : socket.io
            // retente le meme transport en boucle et n'emet que des
            // `connect_error`, alors qu'une premiere connexion avait reussi.
            transports: ['websocket', 'polling'],
            // ⚠️ Pas de connexion a l'import du module : celui-ci est evalue
            // sous le splash, ou seules la version et le catalogue ont le droit
            // de partir. La poignee de main socket.io s'y ajoutait, et ses
            // `connect_error` (20 s de timeout par defaut) polluaient le
            // demarrage. `useSocketEvents` appelle `connect()` une fois l'app
            // montee.
            autoConnect: false,
            // Le repli ne sert a rien si le client ne retente jamais l'upgrade.
            upgrade: true,
            // Reconnexion espacee au lieu d'une rafale : sans plafond, les
            // tentatives s'enchainent toutes les ~1 s et saturent les logs.
            reconnection: true,
            reconnectionDelay: 1_000,
            reconnectionDelayMax: 10_000,
            // Bruit aleatoire : evite que tous les clients reconnectent en meme
            // temps apres une coupure cote serveur.
            randomizationFactor: 0.5,
        });

        this.socket.on('connect', () => {
            // Le transport reellement retenu : `websocket` ou repli `polling`.
            const transport = (this.socket as any).io?.engine?.transport?.name;
            const ms = this.connectStartedAt
                ? Date.now() - this.connectStartedAt
                : null;
            console.log(
                `[boot t=${sinceBoot()}s] socket connecte ${transport}` +
                (ms !== null ? ` en ${(ms / 1000).toFixed(2)}s` : ''),
            );
        });
        // `disconnect` porte la RAISON de la chute, que `connect_error` n'a pas.
        // Sans lui on ne voyait que les echecs de reconnexion, jamais la cause.
        this.socket.on('disconnect', (reason) => {
            console.log('⚠️ Socket disconnect:', reason);
        });
        this.socket.on('connect_error', (err) => {
            const ms = this.connectStartedAt
                ? Date.now() - this.connectStartedAt
                : null;
            console.log(
                `❌ Socket connect_error: ${err?.message}` +
                (ms !== null ? ` apres ${(ms / 1000).toFixed(2)}s` : ''),
            );
        });

        // `connect()` peut venir d'ici (useSocketEvents) comme de la
        // reconnexion automatique : on horodate les deux via le manager.
        (this.socket as any).io?.on?.('reconnect_attempt', () => {
            this.connectStartedAt = Date.now();
        });

        // Verdict de paiement Mobile Money — écouté ici (socket vivant de l'app)
        // et routé vers le handler enregistré par le checkout en cours.
        // ACK obligatoire (event rejoué par le backend si non acquitté).
        this.socket.on('payment.settled', (data, ack?: () => void) => {
            console.log('💳 payment.settled:', data);
            try {
                if (this.paymentHandler) this.paymentHandler(data);
            } finally {
                ack?.();
            }
        });
    }

    public getSocket() {
        return this.socket;
    }

    /**
     * Ouvre la connexion en horodatant le depart, pour que le `connect` (ou le
     * `connect_error`) puisse dire en combien de temps le backend a repondu.
     */
    public connect() {
        if (this.socket.connected) return;
        this.connectStartedAt = Date.now();
        this.socket.connect();
    }

    public registerPaymentHandler(handler: (data: any) => void) {
        this.paymentHandler = handler;
    }

    public unregisterPaymentHandler() {
        this.paymentHandler = null;
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export const socketService = new SocketService();
