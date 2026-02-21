import { io, Socket } from 'socket.io-client';
import { Config } from '../api/config';

class SocketService {
    private socket: Socket;

    constructor() {
        this.socket = io(Config.apiUrl);
    }

    public getSocket() {
        return this.socket;
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

export const socketService = new SocketService();
