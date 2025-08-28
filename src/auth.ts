import axios, { AxiosInstance } from 'axios';

export interface AuthConfig {
  username: string;
  password: string;
  authUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export class AuthManager {
  private config: AuthConfig;
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: AuthConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.authUrl || 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      // SSL-Verifizierung für lokale Entwicklung deaktivieren
      httpsAgent: new (require('https').Agent)({
        rejectUnauthorized: false
      })
    });
  }

  /**
   * Authentifiziert den Benutzer und holt den initialen Token
   */
  async authenticate(): Promise<string> {
    try {
      const tokenData = await this.getToken();
      this.accessToken = tokenData.access_token;
      this.refreshToken = tokenData.refresh_token || null;
      this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  /**
   * Holt einen neuen Token mit Username/Passwort
   */
  private async getToken(): Promise<TokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'password',
      username: this.config.username,
      password: this.config.password,
      client_id: this.config.clientId || 'default-client-id',
      scope: this.config.scope || 'openid profile email',
    });

    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    const response = await this.client.post('/protocol/openid-connect/token', params);
    return response.data;
  }

  /**
   * Holt einen neuen Token mit dem Refresh-Token
   */
  private async refreshAccessToken(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: this.refreshToken,
      client_id: this.config.clientId || 'default-client-id',
      scope: this.config.scope || 'openid profile email',
    });

    if (this.config.clientSecret) {
      params.append('client_secret', this.config.clientSecret);
    }

    const response = await this.client.post('/protocol/openid-connect/token', params);
    const tokenData: TokenResponse = response.data;
    
    this.accessToken = tokenData.access_token;
    this.refreshToken = tokenData.refresh_token || this.refreshToken;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    
    return this.accessToken;
  }

  /**
   * Prüft ob der Token gültig ist und refreshed ihn bei Bedarf
   */
  async getValidToken(): Promise<string> {
    // Wenn kein Token vorhanden, authentifizieren
    if (!this.accessToken) {
      return this.authenticate();
    }

    // Wenn Token abgelaufen ist, refresh
    if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 60000) { // 1 Minute Buffer
      return this.refreshTokenIfNeeded();
    }

    return this.accessToken;
  }

  /**
   * Refresht den Token nur einmal, auch bei parallelen Anfragen
   */
  private async refreshTokenIfNeeded(): Promise<string> {
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.refreshAccessToken();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Gibt den aktuellen Token zurück (ohne Refresh)
   */
  getCurrentToken(): string | null {
    return this.accessToken;
  }

  /**
   * Prüft ob der Token bald abläuft
   */
  isTokenExpiringSoon(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry - 60000; // 1 Minute Buffer
  }

  /**
   * Löscht alle gespeicherten Tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Gibt den Token-Status zurück
   */
  getTokenStatus(): {
    hasToken: boolean;
    expiresAt: Date | null;
    isExpiringSoon: boolean;
  } {
    return {
      hasToken: !!this.accessToken,
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
      isExpiringSoon: this.isTokenExpiringSoon()
    };
  }
}
