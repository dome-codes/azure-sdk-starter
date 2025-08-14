import axios, { AxiosInstance } from 'axios';
import { AuthManager } from './auth';

// Types für die RAG API Requests
export interface CompletionRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  [key: string]: any;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  [key: string]: any;
}

export interface ChunkRequest {
  text: string;
  chunk_size?: number;
  overlap?: number;
  [key: string]: any;
}

export interface SummarizeRequest {
  text: string;
  max_length?: number;
  [key: string]: any;
}

// Configuration Interface
export interface RAGConfig {
  baseURL?: string;
  username?: string;
  password?: string;
  authUrl?: string;
  clientId?: string;
  clientSecret?: string;
  scope?: string;
  apiKey?: string; // Fallback für direkte API-Key-Nutzung
  headers?: Record<string, string>;
}

export class RAGClient {
  private client: AxiosInstance;
  private authManager: AuthManager | null = null;
  private useAuth: boolean = false;
  private config: RAGConfig; // Added this line to store config

  constructor(config: RAGConfig = {}) {
    this.config = config; // Initialize config
    const {
      baseURL = 'https://your-rag-endpoint.com',
      username,
      password,
      authUrl,
      clientId,
      clientSecret,
      scope,
      apiKey = 'YOUR_API_KEY',
      headers = {}
    } = config;

    // Wenn Username/Passwort vorhanden, AuthManager verwenden
    if (username && password) {
      this.useAuth = true;
      this.authManager = new AuthManager({
        username,
        password,
        authUrl,
        clientId,
        clientSecret,
        scope
      });
    }

    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    });

    // Axios Interceptor für automatische Token-Verwaltung
    this.setupAuthInterceptor();
  }

  /**
   * Richtet den Axios Interceptor für automatische Authentifizierung ein
   */
  private setupAuthInterceptor(): void {
    this.client.interceptors.request.use(async (config) => {
      if (this.useAuth && this.authManager) {
        try {
          const token = await this.authManager.getValidToken();
          config.headers.Authorization = `Bearer ${token}`;
        } catch (error) {
          console.warn('Failed to get valid token:', error);
          // Fallback zu API-Key falls vorhanden
          if (config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${config.headers.Authorization}`;
          }
        }
      } else {
        // Fallback zu API-Key - verwende den gespeicherten Wert
        const apiKey = this.config?.apiKey || 'YOUR_API_KEY';
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    });

    // Response Interceptor für Token-Refresh bei 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && this.useAuth && this.authManager) {
          try {
            // Token refresh versuchen
            const newToken = await this.authManager.getValidToken();
            // Request mit neuem Token wiederholen
            const originalRequest = error.config;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authentifiziert den Benutzer (nur bei Username/Passwort-Auth)
   */
  async authenticate(): Promise<string | null> {
    if (this.authManager) {
      return this.authManager.authenticate();
    }
    return null;
  }

  /**
   * Gibt den aktuellen Token-Status zurück
   */
  getTokenStatus() {
    if (this.authManager) {
      return this.authManager.getTokenStatus();
    }
    return null;
  }

  /**
   * Löscht alle gespeicherten Tokens
   */
  clearTokens(): void {
    if (this.authManager) {
      this.authManager.clearTokens();
    }
  }

  async generateCompletion(params: CompletionRequest) {
    try {
      const response = await this.client.post('/completion', params);
      return response.data;
    } catch (error) {
      throw new Error(`Completion generation failed: ${error}`);
    }
  }

  async createEmbeddings(params: EmbeddingRequest) {
    try {
      const response = await this.client.post('/embedding', params);
      return response.data;
    } catch (error) {
      throw new Error(`Embedding creation failed: ${error}`);
    }
  }

  async chunkText(params: ChunkRequest) {
    try {
      const response = await this.client.post('/chunk', params);
      return response.data;
    } catch (error) {
      throw new Error(`Text chunking failed: ${error}`);
    }
  }

  async summarizeText(params: SummarizeRequest) {
    try {
      const response = await this.client.post('/summarize', params);
      return response.data;
    } catch (error) {
      throw new Error(`Text summarization failed: ${error}`);
    }
  }
}

export class RAGSDK {
  public rag: RAGClient;

  constructor(config?: RAGConfig) {
    this.rag = new RAGClient(config);
  }

  /**
   * Authentifiziert den Benutzer
   */
  async authenticate(): Promise<string | null> {
    return this.rag.authenticate();
  }

  /**
   * Gibt den Token-Status zurück
   */
  getTokenStatus() {
    return this.rag.getTokenStatus();
  }

  /**
   * Löscht alle gespeicherten Tokens
   */
  clearTokens(): void {
    this.rag.clearTokens();
  }
}
