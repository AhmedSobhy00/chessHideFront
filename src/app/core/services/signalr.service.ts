import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, BehaviorSubject } from 'rxjs';
import { AppConfigService } from './app-config.service';

@Injectable({ providedIn: 'root' })
export class SignalRService {

  private hubConnection: signalR.HubConnection | null = null;

  // Expose connection state
  readonly isConnected$ = new BehaviorSubject<boolean>(false);

  // Generic event emitter – GameService subscribes to named events
  private eventHandlers = new Map<string, ((data: any) => void)[]>();

  constructor(private configService: AppConfigService) {}

  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    await this.configService.loadConfig();
    const hubUrl = this.configService.apiUrl;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // Forward all registered event names
    this.eventHandlers.forEach((_, eventName) => {
      this.hubConnection!.on(eventName, (data: any) => this.emit(eventName, data));
    });

    this.hubConnection.onreconnected(() => this.isConnected$.next(true));
    this.hubConnection.onreconnecting(() => this.isConnected$.next(false));
    this.hubConnection.onclose(() => this.isConnected$.next(false));

    try {
      await this.hubConnection.start();
      this.isConnected$.next(true);
    } catch (err: any) {
      this.isConnected$.next(false);
      console.error('SignalR Connection Error:', err);
      throw new Error(`Could not connect to backend server at (${hubUrl}). ${err.message || ''}`);
    }

    // Re-register handlers after connection (needed if connect() called multiple times)
    this.eventHandlers.forEach((_, eventName) => {
      this.hubConnection!.on(eventName, (data: any) => this.emit(eventName, data));
    });
  }

  on<T>(event: string, handler: (data: T) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
      // Register with existing connection if already started
      this.hubConnection?.on(event, (data: any) => this.emit(event, data));
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string): void {
    this.eventHandlers.delete(event);
    this.hubConnection?.off(event);
  }

  async invoke(method: string, ...args: any[]): Promise<void> {
    if (!this.hubConnection ||
        this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await this.hubConnection.invoke(method, ...args);
  }

  async disconnect(): Promise<void> {
    await this.hubConnection?.stop();
    this.isConnected$.next(false);
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    handlers?.forEach(h => h(data));
  }
}
