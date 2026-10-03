import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {

  private hubConnection: signalR.HubConnection | null = null;
  private readonly HUB_URL = 'http://localhost:5232/gamehub';

  // Expose connection state
  readonly isConnected$ = new BehaviorSubject<boolean>(false);

  // Generic event emitter – GameService subscribes to named events
  private eventHandlers = new Map<string, ((data: any) => void)[]>();

  async connect(): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) return;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.HUB_URL)
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

    await this.hubConnection.start();
    this.isConnected$.next(true);

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
