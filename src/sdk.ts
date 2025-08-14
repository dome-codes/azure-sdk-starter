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
  
  // Azure OpenAI Konfiguration
  azureEndpoint?: string;
  azureDeploymentName?: string;
  azureEmbeddingDeploymentName?: string;
  
  // Fallback für direkte API-Key-Nutzung
  apiKey?: string;
  headers?: Record<string, string>;
}

export class RAGClient {
  private client: AxiosInstance;
  private authManager: AuthManager | null = null;
  private useAuth: boolean = false;
  private config: RAGConfig;
  
  // Azure OpenAI Client für Backend-Calls (lazy loading)
  private azureClient: any = null;

  constructor(config: RAGConfig = {}) {
    this.config = config;
    const {
      baseURL = 'https://your-rag-endpoint.com',
      username,
      password,
      authUrl,
      clientId,
      clientSecret,
      scope,
      azureEndpoint,
      azureDeploymentName,
      azureEmbeddingDeploymentName,
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

    // Azure OpenAI Client wird lazy geladen
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
   * Lädt den Azure OpenAI Client lazy
   */
  private async loadAzureClient(): Promise<any> {
    if (this.azureClient) return this.azureClient;
    
    if (this.config.azureEndpoint && (this.config.username || this.config.apiKey)) {
      try {
        // Prüfe ob Azure OpenAI verfügbar ist
        const azureOpenAIModule = await this.tryImportAzureOpenAI();
        if (!azureOpenAIModule) {
          console.warn('Azure OpenAI module not available, falling back to own API');
          return null;
        }
        
        const { OpenAIClient, AzureKeyCredential } = azureOpenAIModule;
        
        if (this.config.username && this.authManager) {
          // Verwende den AuthManager für Azure OpenAI
          this.azureClient = new OpenAIClient(this.config.azureEndpoint, {
            getToken: async () => {
              const token = await this.authManager!.getValidToken();
              return { token, expiresOnTimestamp: Date.now() + 3600000 };
            }
          });
        } else if (this.config.apiKey) {
          // Fallback zu API-Key
          const credential = new AzureKeyCredential(this.config.apiKey);
          this.azureClient = new OpenAIClient(this.config.azureEndpoint, credential);
        }
      } catch (error) {
        console.warn('Failed to load Azure OpenAI client:', error);
      }
    }
    
    return this.azureClient;
  }

  /**
   * Versucht Azure OpenAI zu importieren (optional)
   */
  private async tryImportAzureOpenAI(): Promise<any> {
    try {
      return await import('@azure/openai');
    } catch (error) {
      return null;
    }
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
          if (this.config.apiKey) {
            config.headers.Authorization = `Bearer ${this.config.apiKey}`;
          }
        }
      } else if (this.config.apiKey) {
        // Fallback zu API-Key
        config.headers.Authorization = `Bearer ${this.config.apiKey}`;
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

  /**
   * Generiert Text-Completion über Azure OpenAI (falls verfügbar) oder eigene API
   */
  async generateCompletion(params: CompletionRequest) {
    // Versuche zuerst Azure OpenAI, falls verfügbar
    const azureClient = await this.loadAzureClient();
    if (azureClient && this.config.azureDeploymentName) {
      try {
        const result = await azureClient.getChatCompletions(
          this.config.azureDeploymentName,
          [{ role: 'user', content: params.prompt }],
          {
            maxTokens: params.max_tokens,
            temperature: params.temperature
          }
        );

        return {
          result: result.choices[0]?.message?.content,
          usage: result.usage,
          model: this.config.azureDeploymentName
        };
      } catch (error) {
        console.warn('Azure OpenAI completion failed, falling back to own API:', error);
      }
    }

    // Fallback zu eigener API
    try {
      const response = await this.client.post('/completion', params);
      return response.data;
    } catch (error) {
      throw new Error(`Completion generation failed: ${error}`);
    }
  }

  /**
   * Erstellt Embeddings über Azure OpenAI (falls verfügbar) oder eigene API
   */
  async createEmbeddings(params: EmbeddingRequest) {
    // Versuche zuerst Azure OpenAI, falls verfügbar
    const azureClient = await this.loadAzureClient();
    if (azureClient && this.config.azureEmbeddingDeploymentName) {
      try {
        const result = await azureClient.getEmbeddings(
          this.config.azureEmbeddingDeploymentName,
          params.input,
          {
            model: params.model || this.config.azureEmbeddingDeploymentName
          }
        );

        return {
          vector: result.data[0]?.embedding,
          vectors: result.data.map((item: any) => item.embedding),
          model: this.config.azureEmbeddingDeploymentName,
          usage: result.usage
        };
      } catch (error) {
        console.warn('Azure OpenAI embeddings failed, falling back to own API:', error);
      }
    }

    // Fallback zu eigener API
    try {
      const response = await this.client.post('/embedding', params);
      return response.data;
    } catch (error) {
      throw new Error(`Embedding creation failed: ${error}`);
    }
  }

  /**
   * Text chunking (eigene API)
   */
  async chunkText(params: ChunkRequest) {
    try {
      const response = await this.client.post('/chunk', params);
      return response.data;
    } catch (error) {
      throw new Error(`Text chunking failed: ${error}`);
    }
  }

  /**
   * Text zusammenfassen (eigene API)
   */
  async summarizeText(params: SummarizeRequest) {
    try {
      const response = await this.client.post('/summarize', params);
      return response.data;
    } catch (error) {
      throw new Error(`Text summarization failed: ${error}`);
    }
  }

  /**
   * Gibt den Azure OpenAI Client zurück (falls verfügbar)
   */
  async getAzureClient(): Promise<any> {
    return await this.loadAzureClient();
  }

  /**
   * Prüft ob Azure OpenAI verfügbar ist
   */
  async isAzureOpenAIAvailable(): Promise<boolean> {
    const client = await this.loadAzureClient();
    return client !== null;
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

  /**
   * Prüft ob Azure OpenAI verfügbar ist
   */
  async isAzureOpenAIAvailable(): Promise<boolean> {
    return this.rag.isAzureOpenAIAvailable();
  }

  /**
   * Gibt den Azure OpenAI Client zurück
   */
  async getAzureClient() {
    return this.rag.getAzureClient();
  }
}

