import axios, { AxiosInstance } from 'axios';
import { AuthManager } from './auth';
import {
  CompletionRequest,
  CompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
  RAGConfig
} from './types';

export class RAGClient {
  private client: AxiosInstance;
  private authManager?: AuthManager;
  private useAuth: boolean;

  constructor(config?: RAGConfig) {
    this.useAuth = !!(config?.username && config?.password);
    
    // Axios Client konfigurieren
    this.client = axios.create({
      baseURL: config?.baseURL || 'http://localhost:3000',
      timeout: config?.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers
      }
    });

    // Auth Manager initialisieren (falls Username/Password konfiguriert)
    if (this.useAuth && config) {
      this.authManager = new AuthManager({
        username: config.username!,
        password: config.password!,
        authUrl: config.authUrl || 'http://localhost:8080/auth/realms/rag-api-realm/protocol/openid-connect/token',
        clientId: config.clientId || 'your-client-id',
        scope: config.scope || 'openid profile email'
      });
    }

    // Auth Interceptor einrichten
    this.setupAuthInterceptor();
  }

  /**
   * Sets up authentication interceptors for automatic token management
   * @private
   */
  private setupAuthInterceptor() {
    // Request Interceptor - Token hinzufügen
    this.client.interceptors.request.use(
      async (config) => {
        if (this.useAuth && this.authManager) {
          const token = await this.authManager.getValidToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor - Token refresh bei 401
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
   * Authenticates the user using OAuth2 (only for username/password auth)
   * @returns Promise<string | null> - The access token or null if no auth manager
   */
  async authenticate(): Promise<string | null> {
    if (this.authManager) {
      return this.authManager.authenticate();
    }
    return null;
  }

  /**
   * Returns the current token status
   * @returns Token status object or null if no auth manager
   */
  getTokenStatus() {
    if (this.authManager) {
      return this.authManager.getTokenStatus();
    }
    return null;
  }

  /**
   * Clears all stored tokens
   */
  clearTokens(): void {
    if (this.authManager) {
      this.authManager.clearTokens();
    }
  }

  /**
   * Generates text completion using the RAG API
   * @param params - Completion request parameters including messages, model, and generation options
   * @returns Promise<CompletionResponse> - The completion response with choices and usage information
   * @throws Error if the request fails
   * 
   * @example
   * ```typescript
   * const completion = await ragClient.generateCompletion({
   *   messages: [
   *     { role: Role.SYSTEM, content: 'You are a helpful assistant.' },
   *     { role: Role.USER, content: 'Explain RAG in simple terms' }
   *   ],
   *   model: ModelType.GPT_4,
   *   max_tokens: 300,
   *   temperature: 0.7
   * });
   * console.log(completion.choices[0].message.content);
   * ```
   */
  async generateCompletion(params: CompletionRequest): Promise<CompletionResponse> {
    try {
      const response = await this.client.post('/v1/ai/completions', params);
      return response.data;
    } catch (error) {
      throw new Error(`Completion generation failed: ${error}`);
    }
  }

  /**
   * Creates embeddings using the RAG API
   * @param params - Embedding request parameters including input text and model options
   * @returns Promise<EmbeddingResponse> - The embedding response with vector data and usage information
   * @throws Error if the request fails
   * 
   * @example
   * ```typescript
   * const embedding = await ragClient.createEmbeddings({
   *   input: "This is a sample text for embeddings",
   *   model: ModelType.TEXT_EMBEDDING_ADA_002
   * });
   * console.log('Embedding vector:', embedding.data[0].embedding.slice(0, 5));
   * ```
   */
  async createEmbeddings(params: EmbeddingRequest): Promise<EmbeddingResponse> {
    try {
      const response = await this.client.post('/v1/ai/embeddings', params);
      return response.data;
    } catch (error) {
      throw new Error(`Embedding creation failed: ${error}`);
    }
  }

  /**
   * Generates images using the RAG API
   * @param params - Image generation request parameters including prompt, model, and style options
   * @returns Promise<ImageGenerationResponse> - The image generation response with image URLs or base64 data
   * @throws Error if the request fails
   * 
   * @example
   * ```typescript
   * const image = await ragClient.generateImage({
   *   prompt: "A modern logo for an AI company",
   *   model: ModelType.GPT_4,
   *   quality: Quality.HD,
   *   style: Style.NATURAL,
   *   size: Size.SIZE_1024,
   *   response_format: ResponseFormat.URL,
   *   n: 1
   * });
   * console.log('Image URL:', image.data[0].url);
   * ```
   */
  async generateImage(params: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const response = await this.client.post('/v1/ai/images/generations', params);
      return response.data;
    } catch (error) {
      throw new Error(`Image generation failed: ${error}`);
    }
  }
}

/**
 * Main RAG SDK class that provides a simplified interface
 * for all RAG operations including authentication and API calls
 */
export class RAGSDK {
  public rag: RAGClient;

  /**
   * Creates a new RAG SDK instance
   * @param config - Optional configuration for the SDK
   */
  constructor(config?: RAGConfig) {
    this.rag = new RAGClient(config);
  }

  /**
   * Authenticates the user using OAuth2
   * @returns Promise<string | null> - The access token or null
   */
  async authenticate(): Promise<string | null> {
    return this.rag.authenticate();
  }

  /**
   * Returns the current token status
   * @returns Token status object or null
   */
  getTokenStatus() {
    return this.rag.getTokenStatus();
  }

  /**
   * Clears all stored tokens
   */
  clearTokens(): void {
    this.rag.clearTokens();
  }
}

