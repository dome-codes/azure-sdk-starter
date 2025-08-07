import { ChunkRequest, CompletionRequest, EmbeddingRequest, RAGClient, RAGSDK, SummarizeRequest } from '../src/sdk';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn()
}));

describe('RAGSDK', () => {
  let ragSDK: RAGSDK;
  let ragClient: RAGClient;
  let mockPost: jest.Mock;
  let mockAxiosCreate: jest.Mock;
  const baseURL = 'https://test-rag-endpoint.com';
  const apiKey = 'test-api-key';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPost = jest.fn();
    mockAxiosCreate = require('axios').create as jest.Mock;
    mockAxiosCreate.mockReturnValue({ post: mockPost });
    
    ragSDK = new RAGSDK({ baseURL, apiKey });
    ragClient = new RAGClient({ baseURL, apiKey });
  });

  describe('Constructor', () => {
    it('should create RAGSDK with default config', () => {
      const sdk = new RAGSDK();
      expect(sdk.rag).toBeInstanceOf(RAGClient);
    });

    it('should create RAGSDK with custom config', () => {
      const config = { baseURL: 'https://custom.com', apiKey: 'custom-key' };
      const sdk = new RAGSDK(config);
      expect(sdk.rag).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with default config', () => {
      const client = new RAGClient();
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with custom config', () => {
      const config = { baseURL: 'https://custom.com', apiKey: 'custom-key' };
      const client = new RAGClient(config);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with headers', () => {
      const config = { 
        baseURL: 'https://custom.com', 
        apiKey: 'custom-key',
        headers: { 'Custom-Header': 'value' }
      };
      const client = new RAGClient(config);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should configure axios with correct settings', () => {
      const config = { baseURL: 'https://test.com', apiKey: 'test-key' };
      new RAGClient(config);
      
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: 'https://test.com',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('generateCompletion', () => {
    it('should generate completion successfully', async () => {
      const mockResponse = {
        data: {
          result: 'RAG ist eine Technik zur Erweiterung von LLMs mit externen Datenquellen.',
          tokens_used: 25
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const request: CompletionRequest = {
        prompt: 'Erkläre RAG',
        max_tokens: 100,
        temperature: 0.7
      };

      const result = await ragClient.generateCompletion(request);
      
      expect(mockPost).toHaveBeenCalledWith('/completion', request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle completion errors', async () => {
      const error = new Error('API Error');
      mockPost.mockRejectedValue(error);

      const request: CompletionRequest = {
        prompt: 'Test prompt'
      };

      await expect(ragClient.generateCompletion(request))
        .rejects
        .toThrow('Completion generation failed:');
    });
  });

  describe('createEmbeddings', () => {
    it('should create embeddings successfully with string input', async () => {
      const mockResponse = {
        data: {
          vector: [0.1, 0.2, 0.3, 0.4, 0.5],
          model: 'text-embedding-ada-002'
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const request: EmbeddingRequest = {
        input: 'Test text',
        model: 'text-embedding-ada-002'
      };

      const result = await ragClient.createEmbeddings(request);
      
      expect(mockPost).toHaveBeenCalledWith('/embedding', request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should create embeddings successfully with array input', async () => {
      const mockResponse = {
        data: {
          vectors: [[0.1, 0.2], [0.3, 0.4]],
          model: 'text-embedding-ada-002'
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const request: EmbeddingRequest = {
        input: ['Text 1', 'Text 2'],
        model: 'text-embedding-ada-002'
      };

      const result = await ragClient.createEmbeddings(request);
      
      expect(mockPost).toHaveBeenCalledWith('/embedding', request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle embedding errors', async () => {
      const error = new Error('Invalid input');
      mockPost.mockRejectedValue(error);

      const request: EmbeddingRequest = {
        input: ''
      };

      await expect(ragClient.createEmbeddings(request))
        .rejects
        .toThrow('Embedding creation failed:');
    });
  });

  describe('chunkText', () => {
    it('should chunk text successfully', async () => {
      const mockResponse = {
        data: {
          total_chunks: 2,
          chunks: [
            { text: 'Dies ist der erste Chunk', index: 0 },
            { text: 'Dies ist der zweite Chunk', index: 1 }
          ]
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const request: ChunkRequest = {
        text: 'Dies ist ein langer Text',
        chunk_size: 100,
        overlap: 20
      };

      const result = await ragClient.chunkText(request);
      
      expect(mockPost).toHaveBeenCalledWith('/chunk', request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle chunking errors', async () => {
      const error = new Error('Chunking failed');
      mockPost.mockRejectedValue(error);

      const request: ChunkRequest = {
        text: ''
      };

      await expect(ragClient.chunkText(request))
        .rejects
        .toThrow('Text chunking failed:');
    });
  });

  describe('summarizeText', () => {
    it('should summarize text successfully', async () => {
      const mockResponse = {
        data: {
          summary: 'Kurze Zusammenfassung des Textes.',
          original_length: 500,
          summary_length: 50
        }
      };
      mockPost.mockResolvedValue(mockResponse);

      const request: SummarizeRequest = {
        text: 'Ein sehr langer Text...',
        max_length: 100
      };

      const result = await ragClient.summarizeText(request);
      
      expect(mockPost).toHaveBeenCalledWith('/summarize', request);
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle summarization errors', async () => {
      const error = new Error('Text too short');
      mockPost.mockRejectedValue(error);

      const request: SummarizeRequest = {
        text: 'Kurz'
      };

      await expect(ragClient.summarizeText(request))
        .rejects
        .toThrow('Text summarization failed:');
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
        text: 'Dies ist ein langer Text',
        chunk_size: 100,
        overlap: 20
      };
      expect(request.text).toBe('Dies ist ein langer Text');
      expect(request.chunk_size).toBe(100);
      expect(request.overlap).toBe(20);
    });

    it('should accept valid SummarizeRequest', () => {
      const request: SummarizeRequest = {
        text: 'Ein sehr langer Text...',
        max_length: 100
      };
      expect(request.text).toBe('Ein sehr langer Text...');
      expect(request.max_length).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid URLs gracefully', () => {
      const client = new RAGClient({ baseURL: 'invalid-url' });
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should handle missing API keys gracefully', () => {
      const client = new RAGClient({ baseURL: 'https://test.com' });
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should handle empty config gracefully', () => {
      const client = new RAGClient({});
      expect(client).toBeInstanceOf(RAGClient);
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
  });
}); 