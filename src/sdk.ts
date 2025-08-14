import { AzureOpenAIClient } from './azure-openai-sdk';

// Types für die RAG API Requests
export interface CompletionRequest {
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  [key: string]: string | number | undefined;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
  [key: string]: string | string[] | undefined;
}

export interface ChunkRequest {
  text: string;
  chunk_size?: number;
  overlap?: number;
  [key: string]: string | number | undefined;
}

export interface SummarizeRequest {
  text: string;
  max_length?: number;
  [key: string]: string | number | undefined;
}

// Configuration Interface
export interface RAGConfig {
  // Azure OpenAI Konfiguration (erforderlich)
  endpoint: string;
  
  // Authentifizierung - entweder API Key ODER Username/Password
  apiKey?: string;                    // Für Azure OpenAI
  username?: string;                   // Für RAG-API
  password?: string;                   // Für RAG-API
  
  // Optionale Azure-Parameter (werden im Backend gesetzt falls nicht angegeben)
  deploymentName?: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
  
  // Managed Identity für Azure OpenAI (optional)
  useManagedIdentity?: boolean;
  
  // Fallback für direkte API-Key-Nutzung
  headers?: Record<string, string>;
}

export class RAGClient {
  private readonly azureClient: AzureOpenAIClient;

  constructor(config: RAGConfig) {
    // Endpoint validieren
    if (!config.endpoint) {
      throw new Error('Endpoint is required');
    }
    
    // Azure OpenAI Client erstellen
    const azureConfig: any = {
      endpoint: config.endpoint,
      deploymentName: config.deploymentName || 'gpt-4',
      embeddingDeploymentName: config.embeddingDeploymentName || 'text-embedding-ada-002'
    };
    
    // Authentifizierung: entweder API Key ODER Managed Identity ODER Username/Password
    if (config.apiKey) {
      azureConfig.apiKey = config.apiKey;
    } else if (config.useManagedIdentity) {
      azureConfig.useManagedIdentity = config.useManagedIdentity;
    } else if (config.username && config.password) {
      // Username/Password für RAG-API - Azure OpenAI wird über das Backend aufgerufen
      // Für jetzt verwenden wir einen Dummy-API-Key, da das Backend die Authentifizierung handhabt
      azureConfig.apiKey = 'dummy-key-for-rag-api';
    } else {
      throw new Error('Either apiKey, useManagedIdentity, or username/password must be provided');
    }
    
    if (config.apiVersion) azureConfig.apiVersion = config.apiVersion;
    
    this.azureClient = new AzureOpenAIClient(azureConfig);
  }

  /**
   * Generiert Text-Completion direkt über Azure OpenAI
   */
  async generateCompletion(params: CompletionRequest): Promise<unknown> {
    try {
      const completionParams: any = {
        prompt: params.prompt
      };
      
      if (params.max_tokens !== undefined) completionParams.maxTokens = params.max_tokens;
      if (params.temperature !== undefined) completionParams.temperature = params.temperature;
      
      const result = await this.azureClient.generateCompletion(completionParams);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Completion generation failed: ${errorMessage}`);
    }
  }

  /**
   * Erstellt Embeddings direkt über Azure OpenAI
   */
  async createEmbeddings(params: EmbeddingRequest): Promise<unknown> {
    try {
      const embeddingParams: any = {
        input: params.input
      };
      
      if (params.model !== undefined) embeddingParams.model = params.model;
      
      const result = await this.azureClient.createEmbeddings(embeddingParams);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding creation failed: ${errorMessage}`);
    }
  }

  /**
   * Text chunking (eigene RAG-API über dein Backend)
   */
  async chunkText(_params: ChunkRequest): Promise<unknown> {
    // Für jetzt werfen wir einen Fehler, da die Backend-Integration noch nicht implementiert ist
    throw new Error('Chunking not yet implemented - requires backend integration');
  }

  /**
   * Text zusammenfassen (eigene RAG-API über dein Backend)
   */
  async summarizeText(_params: SummarizeRequest): Promise<unknown> {
    // Für jetzt werfen wir einen Fehler, da die Backend-Integration noch nicht implementiert ist
    throw new Error('Summarization not yet implemented - requires backend integration');
  }

  /**
   * Gibt den Azure OpenAI Client zurück für direkten Zugriff
   */
  getAzureClient(): AzureOpenAIClient {
    return this.azureClient;
  }
}

export class RAGSDK {
  public rag: RAGClient;

  constructor(config: RAGConfig) {
    this.rag = new RAGClient(config);
  }

  /**
   * Gibt den Azure OpenAI Client zurück
   */
  getAzureClient() {
    return this.rag.getAzureClient();
  }
}

