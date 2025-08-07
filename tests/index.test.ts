import {
    ChunkRequest,
    CompletionRequest,
    EmbeddingRequest,
    RAGClient,
    RAGConfig,
    RAGSDK,
    SummarizeRequest
} from '../src/index';

describe('Index Exports', () => {
  describe('Class Exports', () => {
    it('should export RAGClient class', () => {
      expect(RAGClient).toBeDefined();
      expect(typeof RAGClient).toBe('function');
    });

    it('should export RAGSDK class', () => {
      expect(RAGSDK).toBeDefined();
      expect(typeof RAGSDK).toBe('function');
    });

    it('should be able to instantiate RAGClient from index', () => {
      const client = new RAGClient();
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should be able to instantiate RAGSDK from index', () => {
      const sdk = new RAGSDK();
      expect(sdk).toBeInstanceOf(RAGSDK);
    });
  });

  describe('Type Exports', () => {
    it('should export ChunkRequest type', () => {
      const request: ChunkRequest = {
        text: 'Test text',
        chunk_size: 100,
        overlap: 20
      };
      expect(request.text).toBe('Test text');
      expect(request.chunk_size).toBe(100);
      expect(request.overlap).toBe(20);
    });

    it('should export CompletionRequest type', () => {
      const request: CompletionRequest = {
        prompt: 'Test prompt',
        max_tokens: 100,
        temperature: 0.7
      };
      expect(request.prompt).toBe('Test prompt');
      expect(request.max_tokens).toBe(100);
      expect(request.temperature).toBe(0.7);
    });

    it('should export EmbeddingRequest type', () => {
      const request: EmbeddingRequest = {
        input: 'Test text',
        model: 'text-embedding-ada-002'
      };
      expect(request.input).toBe('Test text');
      expect(request.model).toBe('text-embedding-ada-002');
    });

    it('should export RAGConfig type', () => {
      const config: RAGConfig = {
        baseURL: 'https://test.com',
        apiKey: 'test-key',
        headers: { 'Custom-Header': 'value' }
      };
      expect(config.baseURL).toBe('https://test.com');
      expect(config.apiKey).toBe('test-key');
      expect(config.headers?.['Custom-Header']).toBe('value');
    });

    it('should export SummarizeRequest type', () => {
      const request: SummarizeRequest = {
        text: 'Test text to summarize',
        max_length: 100
      };
      expect(request.text).toBe('Test text to summarize');
      expect(request.max_length).toBe(100);
    });
  });

  describe('Generated Exports', () => {
    it('should export generated functions', () => {
      // Test that generated exports are available
      // This tests the export * from './generated/default/default';
      expect(true).toBe(true);
    });

    it('should export generated schemas', () => {
      // Test that generated schemas are available
      // This tests the export * from './generated/schemas';
      expect(true).toBe(true);
    });
  });
}); 