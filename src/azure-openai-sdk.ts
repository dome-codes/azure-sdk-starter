import { DefaultAzureCredential } from '@azure/identity';
import { AzureKeyCredential, ChatCompletions, Embeddings, GetChatCompletionsOptions, GetEmbeddingsOptions, OpenAIClient } from '@azure/openai';

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey?: string;
  useManagedIdentity?: boolean;
  deploymentName?: string;
  embeddingDeploymentName?: string;
  apiVersion?: string;
  maxRetries?: number;
}

export interface ChatCompletionRequest {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

export interface CompletionRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export class AzureOpenAIClient {
  private client: OpenAIClient;
  private config: AzureOpenAIConfig;
  private deploymentName: string;
  private embeddingDeploymentName: string;

  constructor(config: AzureOpenAIConfig) {
    this.config = config;
    this.deploymentName = config.deploymentName || 'gpt-4';
    this.embeddingDeploymentName = config.embeddingDeploymentName || 'text-embedding-ada-002';

    // Erstelle Client mit Azure Key oder Managed Identity
    if (config.useManagedIdentity) {
      const credential = new DefaultAzureCredential();
      this.client = new OpenAIClient(config.endpoint, credential);
    } else if (config.apiKey) {
      const credential = new AzureKeyCredential(config.apiKey);
      this.client = new OpenAIClient(config.endpoint, credential);
    } else {
      throw new Error('Either apiKey or useManagedIdentity must be provided');
    }
  }

  /**
   * Generiert Chat-Completions mit dem Azure OpenAI Service
   */
  async generateChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletions> {
    try {
      const options: GetChatCompletionsOptions = {};
      
      if (request.maxTokens !== undefined) options.maxTokens = request.maxTokens;
      if (request.temperature !== undefined) options.temperature = request.temperature;
      if (request.topP !== undefined) options.topP = request.topP;
      if (request.frequencyPenalty !== undefined) options.frequencyPenalty = request.frequencyPenalty;
      if (request.presencePenalty !== undefined) options.presencePenalty = request.presencePenalty;
      if (request.stop !== undefined) options.stop = request.stop;

      const result = await this.client.getChatCompletions(
        this.deploymentName,
        request.messages,
        options
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Chat completion generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generiert Text-Completions (für ältere Modelle)
   */
  async generateCompletion(request: CompletionRequest): Promise<ChatCompletions> {
    try {
      // Für Text-Completions verwenden wir Chat-Completions mit einem einzelnen User-Message
      const chatRequest: ChatCompletionRequest = {
        messages: [{ role: 'user', content: request.prompt }]
      };
      
      if (request.maxTokens !== undefined) chatRequest.maxTokens = request.maxTokens;
      if (request.temperature !== undefined) chatRequest.temperature = request.temperature;
      if (request.topP !== undefined) chatRequest.topP = request.topP;
      if (request.frequencyPenalty !== undefined) chatRequest.frequencyPenalty = request.frequencyPenalty;
      if (request.presencePenalty !== undefined) chatRequest.presencePenalty = request.presencePenalty;
      if (request.stop !== undefined) chatRequest.stop = request.stop;

      return this.generateChatCompletion(chatRequest);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Text completion generation failed: ${errorMessage}`);
    }
  }

  /**
   * Erstellt Embeddings mit dem Azure OpenAI Service
   */
  async createEmbeddings(request: EmbeddingRequest): Promise<Embeddings> {
    try {
      const options: GetEmbeddingsOptions = {
        model: request.model || this.embeddingDeploymentName
      };

      const inputArray = Array.isArray(request.input) ? request.input : [request.input];

      const result = await this.client.getEmbeddings(
        this.embeddingDeploymentName,
        inputArray,
        options
      );

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Embedding creation failed: ${errorMessage}`);
    }
  }

  /**
   * Gibt den aktuellen Client zurück
   */
  getClient(): OpenAIClient {
    return this.client;
  }

  /**
   * Ändert das aktuelle Deployment
   */
  setDeployment(deploymentName: string): void {
    this.deploymentName = deploymentName;
  }

  /**
   * Ändert das aktuelle Embedding-Deployment
   */
  setEmbeddingDeployment(deploymentName: string): void {
    this.embeddingDeploymentName = deploymentName;
  }

  /**
   * Gibt die aktuelle Konfiguration zurück
   */
  getConfig(): AzureOpenAIConfig {
    return { ...this.config };
  }
}

export class AzureOpenAISDK {
  public openai: AzureOpenAIClient;

  constructor(config: AzureOpenAIConfig) {
    this.openai = new AzureOpenAIClient(config);
  }

  /**
   * Generiert eine Chat-Completion
   */
  async chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletions> {
    return this.openai.generateChatCompletion(request);
  }

  /**
   * Generiert eine Text-Completion
   */
  async completion(request: CompletionRequest): Promise<ChatCompletions> {
    return this.openai.generateCompletion(request);
  }

  /**
   * Erstellt Embeddings
   */
  async embeddings(request: EmbeddingRequest): Promise<Embeddings> {
    return this.openai.createEmbeddings(request);
  }

  /**
   * Ändert das aktuelle Deployment
   */
  setDeployment(deploymentName: string): void {
    this.openai.setDeployment(deploymentName);
  }

  /**
   * Ändert das aktuelle Embedding-Deployment
   */
  setEmbeddingDeployment(deploymentName: string): void {
    this.openai.setEmbeddingDeployment(deploymentName);
  }
}
