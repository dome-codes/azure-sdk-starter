import { ChunkRequest, CompletionRequest, EmbeddingRequest, RAGClient, RAGSDK, SummarizeRequest } from '../src/sdk';

// Mock axios für Tests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn()
  }))
}));

describe('RAGSDK', () => {
  let ragSDK: RAGSDK;
  let ragClient: RAGClient;
  const baseURL = 'https://test-rag-endpoint.com';
  const apiKey = 'test-api-key';

  beforeEach(() => {
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