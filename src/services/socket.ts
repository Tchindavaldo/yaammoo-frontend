import { io, Socket } from 'socket.io-client';
import { Config } from '../api/config';

class SocketService {
    private socket: Socket;
    private paymentHandler: ((data: any) => void) | null = null;

    constructor() {
        this.socket = io(Config.apiUrl, {
            transports: ['websocket'],
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected', this.socket.id);
        });
        this.socket.on('connect_error', (err) => {
            console.log('❌ Socket connect_error:', err?.message);
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
