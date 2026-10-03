import { Injectable } from '@angular/core';

export interface AppConfig {
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private config: AppConfig = {
    apiUrl: 'http://localhost:5232/gamehub'
  };
  private loaded = false;

  get apiUrl(): string {
    return this.config.apiUrl;
  }

  async loadConfig(): Promise<AppConfig> {
    if (this.loaded) return this.config;

    // 1. Check window.APP_CONFIG override first (from config.js or index.html)
    const winConfig = (window as any).APP_CONFIG;
    if (winConfig && winConfig.apiUrl && typeof winConfig.apiUrl === 'string') {
      this.config.apiUrl = winConfig.apiUrl.trim();
      this.loaded = true;
      return this.config;
    }

    // 2. Otherwise fetch config.json at runtime
    try {
      const response = await fetch('/config.json');
      if (response.ok) {
        const data = await response.json();
        if (data && data.apiUrl && typeof data.apiUrl === 'string') {
          this.config.apiUrl = data.apiUrl.trim();
        }
      }
    } catch (e) {
      console.warn('Could not load config.json, using default API URL');
    }

    this.loaded = true;
    return this.config;
  }
}
