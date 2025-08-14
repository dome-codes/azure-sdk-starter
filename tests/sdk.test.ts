import { ChunkRequest, CompletionRequest, EmbeddingRequest, RAGClient, RAGConfig, RAGSDK, SummarizeRequest } from '../src/sdk';

// Mock Azure OpenAI SDK
let mockAzureClient: any;

jest.mock('../src/azure-openai-sdk', () => ({
  AzureOpenAIClient: jest.fn().mockImplementation(() => mockAzureClient)
}));

describe('RAGSDK', () => {
  let ragClient: RAGClient;
  const mockConfig: RAGConfig = {
    endpoint: 'https://test.openai.azure.com/',
    apiKey: 'test-api-key'
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Azure OpenAI Client
    mockAzureClient = {
      generateCompletion: jest.fn(),
      createEmbeddings: jest.fn()
    };
    
    const { AzureOpenAIClient } = require('../src/azure-openai-sdk');
    AzureOpenAIClient.mockImplementation(() => mockAzureClient);
    
    ragClient = new RAGClient(mockConfig);
  });

  describe('Constructor', () => {
    it('should create RAGSDK with config', () => {
      const sdk = new RAGSDK(mockConfig);
      expect(sdk.rag).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with config', () => {
      const client = new RAGClient(mockConfig);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should create Azure OpenAI Client', () => {
      const { AzureOpenAIClient } = require('../src/azure-openai-sdk');
      expect(AzureOpenAIClient).toHaveBeenCalledWith(expect.objectContaining({
        endpoint: 'https://test.openai.azure.com/',
        apiKey: 'test-api-key',
        deploymentName: 'gpt-4',
        embeddingDeploymentName: 'text-embedding-ada-002'
      }));
    });
  });

  describe('generateCompletion', () => {
    it('should generate completion successfully', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'RAG ist eine Technik zur Erweiterung von LLMs mit externen Datenquellen.'
          }
        }],
        usage: { total_tokens: 25 }
      };
      mockAzureClient.generateCompletion.mockResolvedValue(mockResponse);

      const request: CompletionRequest = {
        prompt: 'Erkläre RAG',
        max_tokens: 100,
        temperature: 0.7
      };

      const result = await ragClient.generateCompletion(request);
      
      expect(mockAzureClient.generateCompletion).toHaveBeenCalledWith({
        prompt: 'Erkläre RAG',
        maxTokens: 100,
        temperature: 0.7
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle completion errors', async () => {
      const error = new Error('API Error');
      mockAzureClient.generateCompletion.mockRejectedValue(error);

      const request: CompletionRequest = {
        prompt: 'Erkläre RAG',
        max_tokens: 100
      };

      await expect(ragClient.generateCompletion(request))
        .rejects
        .toThrow('Completion generation failed: API Error');
    });
  });

  describe('createEmbeddings', () => {
    it('should create embeddings successfully', async () => {
      const mockResponse = {
        data: [{
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
          index: 0
        }],
        usage: { total_tokens: 10 }
      };
      mockAzureClient.createEmbeddings.mockResolvedValue(mockResponse);

      const request: EmbeddingRequest = {
        input: 'Text für Embeddings',
        model: 'text-embedding-ada-002'
      };

      const result = await ragClient.createEmbeddings(request);
      
      expect(mockAzureClient.createEmbeddings).toHaveBeenCalledWith({
        input: 'Text für Embeddings',
        model: 'text-embedding-ada-002'
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle embedding errors', async () => {
      const error = new Error('API Error');
      mockAzureClient.createEmbeddings.mockRejectedValue(error);

      const request: EmbeddingRequest = {
        input: 'Text für Embeddings'
      };

      await expect(ragClient.createEmbeddings(request))
        .rejects
        .toThrow('Embedding creation failed: API Error');
    });
  });

  describe('chunkText', () => {
    it('should throw error for not implemented feature', async () => {
      const request: ChunkRequest = {
        text: 'Dies ist ein langer Text',
        chunk_size: 100,
        overlap: 20
      };

      await expect(ragClient.chunkText(request))
        .rejects
        .toThrow('Chunking not yet implemented - requires backend integration');
    });
  });

  describe('summarizeText', () => {
    it('should throw error for not implemented feature', async () => {
      const request: SummarizeRequest = {
        text: 'Ein sehr langer Text...',
        max_length: 100
      };

      await expect(ragClient.summarizeText(request))
        .rejects
        .toThrow('Summarization not yet implemented - requires backend integration');
    });
  });

  describe('Request Interfaces', () => {
    it('should accept valid CompletionRequest', () => {
      const request: CompletionRequest = {
        prompt: 'Erkläre RAG',
        max_tokens: 100,
        temperature: 0.7
      };
      expect(request.prompt).toBe('Erkläre RAG');
      expect(request.max_tokens).toBe(100);
      expect(request.temperature).toBe(0.7);
    });

    it('should accept valid EmbeddingRequest with string', () => {
      const request: EmbeddingRequest = {
        input: 'Test text',
        model: 'text-embedding-ada-002'
      };
      expect(request.input).toBe('Test text');
      expect(request.model).toBe('text-embedding-ada-002');
    });

    it('should accept valid EmbeddingRequest with array', () => {
      const request: EmbeddingRequest = {
        input: ['Text 1', 'Text 2'],
        model: 'text-embedding-ada-002'
      };
      expect(Array.isArray(request.input)).toBe(true);
      expect(request.input).toHaveLength(2);
    });

    it('should accept valid ChunkRequest', () => {
      const request: ChunkRequest = {
        text: 'Long text to chunk',
        chunk_size: 100,
        overlap: 20
      };
      expect(request.text).toBe('Long text to chunk');
      expect(request.chunk_size).toBe(100);
      expect(request.overlap).toBe(20);
    });

    it('should accept valid SummarizeRequest', () => {
      const request: SummarizeRequest = {
        text: 'Long text to summarize',
        max_length: 100
      };
      expect(request.text).toBe('Long text to summarize');
      expect(request.max_length).toBe(100);
    });
  });

  describe('Configuration', () => {
    it('should accept valid config with API key', () => {
      const config: RAGConfig = {
        endpoint: 'https://test.openai.azure.com/',
        apiKey: 'test-api-key'
      };
      
      expect(() => new RAGClient(config)).not.toThrow();
    });

    it('should accept valid config with username/password', () => {
      const config: RAGConfig = {
        endpoint: 'https://test.openai.azure.com/',
        username: 'testuser',
        password: 'testpass'
      };
      
      expect(() => new RAGClient(config)).not.toThrow();
    });

    it('should accept config with managed identity', () => {
      const config: RAGConfig = {
        endpoint: 'https://test.openai.azure.com/',
        useManagedIdentity: true
      };
      
      expect(() => new RAGClient(config)).not.toThrow();
    });

    it('should require either apiKey, username/password, or useManagedIdentity', () => {
      const config: RAGConfig = {
        endpoint: 'https://test.openai.azure.com/'
        // Keine Authentifizierung
      };
      
      expect(() => new RAGClient(config)).toThrow('Either apiKey, useManagedIdentity, or username/password must be provided');
    });

    it('should accept optional Azure parameters', () => {
      const config: RAGConfig = {
        endpoint: 'https://test.openai.azure.com/',
        apiKey: 'test-api-key',
        deploymentName: 'custom-deployment',
        embeddingDeploymentName: 'custom-embedding',
        apiVersion: '2024-02-15-preview'
      };
      
      expect(() => new RAGClient(config)).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing endpoint gracefully', () => {
      const config: any = {
        apiKey: 'test-key'
      };
      
      expect(() => new RAGClient(config)).toThrow('Endpoint is required');
    });

    it('should handle missing API keys gracefully', () => {
      const config: any = {
        endpoint: 'https://test.openai.azure.com/'
        // Keine Authentifizierung
      };
      
      expect(() => new RAGClient(config)).toThrow('Either apiKey, useManagedIdentity, or username/password must be provided');
    });
  });

  describe('SDK Methods', () => {
    it('should have generateCompletion method', () => {
      expect(typeof ragClient.generateCompletion).toBe('function');
    });

    it('should have createEmbeddings method', () => {
      expect(typeof ragClient.createEmbeddings).toBe('function');
    });

    it('should have chunkText method', () => {
      expect(typeof ragClient.chunkText).toBe('function');
    });

    it('should have summarizeText method', () => {
      expect(typeof ragClient.summarizeText).toBe('function');
    });

    it('should have getAzureClient method', () => {
      expect(typeof ragClient.getAzureClient).toBe('function');
    });
  });
}); 