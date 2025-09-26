import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class HassWebSocketClient extends EventEmitter {
    private ws: WebSocket | null = null;
    private messageId = 1;
    private authenticated = false;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private subscriptions = new Map<string, (data: any) => void>();

    constructor(
        private url: string,
        private token: string,
        private options: {
            autoReconnect?: boolean;
            maxReconnectAttempts?: number;
            reconnectDelay?: number;
        } = {}
    ) {
        super();
        this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
        this.reconnectDelay = options.reconnectDelay || 1000;
    }

    public async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);

                this.ws.on('open', () => {
                    this.authenticate();
                });

                this.ws.on('message', (data: string) => {
                    const message = JSON.parse(data);
                    this.handleMessage(message);
                });

                this.ws.on('close', () => {
                    this.handleDisconnect();
                });

                this.ws.on('error', (error) => {
                    this.emit('error', error);
                    reject(error);
                });

                this.once('auth_ok', () => {
                    this.authenticated = true;
                    this.reconnectAttempts = 0;
                    resolve();
                });

                this.once('auth_invalid', () => {
                    reject(new Error('Authentication failed'));
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    private authenticate(): void {
        this.send({
            type: 'auth',
            access_token: this.token
        });
    }

    private handleMessage(message: any): void {
        switch (message.type) {
            case 'auth_required':
                this.authenticate();
                break;
            case 'auth_ok':
                this.emit('auth_ok');
                break;
            case 'auth_invalid':
                this.emit('auth_invalid');
                break;
            case 'event':
                this.handleEvent(message);
                break;
            case 'result':
                this.emit(`result_${message.id}`, message);
                break;
        }
    }

    private handleEvent(message: any): void {
        const subscription = this.subscriptions.get(message.event.event_type);
        if (subscription) {
            subscription(message.event.data);
        }
        this.emit('event', message.event);
    }

    private handleDisconnect(): void {
        this.authenticated = false;
        this.emit('disconnected');

        if (this.options.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectAttempts++;
                this.connect().catch((error) => {
                    this.emit('error', error);
                });
            }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
        }
    }

    public async subscribeEvents(eventType: string, callback: (data: any) => void): Promise<number> {
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }

        const id = this.messageId++;
        this.subscriptions.set(eventType, callback);

        return new Promise((resolve, reject) => {
            this.send({
                id,
                type: 'subscribe_events',
                event_type: eventType
            });

            this.once(`result_${id}`, (message) => {
                if (message.success) {
                    resolve(id);
                } else {
                    reject(new Error(message.error?.message || 'Subscription failed'));
                }
            });
        });
    }

    public async unsubscribeEvents(subscription: number): Promise<void> {
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }

        const id = this.messageId++;
        return new Promise((resolve, reject) => {
            this.send({
                id,
                type: 'unsubscribe_events',
                subscription
            });

            this.once(`result_${id}`, (message) => {
                if (message.success) {
                    resolve();
                } else {
                    reject(new Error(message.error?.message || 'Unsubscribe failed'));
                }
            });
        });
    }

    public async callWS(message: any): Promise<any> {
        if (!this.authenticated) {
            throw new Error('Not authenticated');
        }

        const id = this.messageId++;
        const requestMessage = { id, ...message };

        return new Promise((resolve, reject) => {
            this.send(requestMessage);

            this.once(`result_${id}`, (response) => {
                if (response.success) {
                    resolve(response.result);
                } else {
                    reject(new Error(response.error?.message || 'WebSocket command failed'));
                }
            });
        });
    }

    public async getAutomationConfig(entityId: string): Promise<any> {
        return this.callWS({
            type: 'automation/config',
            entity_id: entityId
        });
    }

    public async getConfig(): Promise<any> {
        return this.callWS({
            type: 'get_config'
        });
    }

    public async getStates(): Promise<any> {
        return this.callWS({
            type: 'get_states'
        });
    }

    public async callService(domain: string, service: string, serviceData?: any, target?: any): Promise<any> {
        const message: any = {
            type: 'call_service',
            domain,
            service
        };

        if (serviceData) {
            message.service_data = serviceData;
        }

        if (target) {
            message.target = target;
        }

        return this.callWS(message);
    }

    public async validateConfig(trigger?: any, condition?: any, action?: any): Promise<any> {
        const message: any = {
            type: 'validate_config'
        };

        if (trigger) message.trigger = trigger;
        if (condition) message.condition = condition;
        if (action) message.action = action;

        return this.callWS(message);
    }

    private send(message: any): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    public isConnected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN && this.authenticated;
    }

    public disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
} 