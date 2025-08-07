import axios, { AxiosInstance } from 'axios';

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
  apiKey?: string;
  headers?: Record<string, string>;
}

export class RAGClient {
  private client: AxiosInstance;

  constructor(config: RAGConfig = {}) {
    const {
      baseURL = 'https://your-rag-endpoint.com',
      apiKey = 'YOUR_API_KEY',
      headers = {}
    } = config;

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...headers
      }
    });
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
}
