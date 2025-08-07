import {
    ChunkRequest,
    CompletionRequest,
    EmbeddingRequest,
    RAGConfig,
    SummarizeRequest
} from '../src/sdk';

describe('TypeScript Types and Interfaces', () => {
  describe('CompletionRequest', () => {
    it('should accept valid completion request', () => {
      const request: CompletionRequest = {
        prompt: 'Test prompt',
        max_tokens: 100,
        temperature: 0.7
      };
      expect(request.prompt).toBe('Test prompt');
      expect(request.max_tokens).toBe(100);
      expect(request.temperature).toBe(0.7);
    });

    it('should accept additional properties', () => {
      const request: CompletionRequest = {
        prompt: 'Test prompt',
        max_tokens: 100,
        temperature: 0.7,
        custom_property: 'test'
      };
      expect(request.custom_property).toBe('test');
    });
  });

  describe('EmbeddingRequest', () => {
    it('should accept string input', () => {
      const request: EmbeddingRequest = {
        input: 'Test text',
        model: 'text-embedding-ada-002'
      };
      expect(request.input).toBe('Test text');
    });

    it('should accept array input', () => {
      const request: EmbeddingRequest = {
        input: ['Text 1', 'Text 2'],
        model: 'text-embedding-ada-002'
      };
      expect(Array.isArray(request.input)).toBe(true);
    });
  });

  describe('ChunkRequest', () => {
    it('should accept valid chunk request', () => {
      const request: ChunkRequest = {
        text: 'Long text to chunk',
        chunk_size: 100,
        overlap: 20
      };
      expect(request.text).toBe('Long text to chunk');
      expect(request.chunk_size).toBe(100);
      expect(request.overlap).toBe(20);
    });
  });

  describe('SummarizeRequest', () => {
    it('should accept valid summarize request', () => {
      const request: SummarizeRequest = {
        text: 'Long text to summarize',
        max_length: 100
      };
      expect(request.text).toBe('Long text to summarize');
      expect(request.max_length).toBe(100);
    });
  });

  describe('RAGConfig', () => {
    it('should accept valid config', () => {
      const config: RAGConfig = {
        baseURL: 'https://api.example.com',
        apiKey: 'test-key',
        headers: { 'Custom-Header': 'value' }
      };
      expect(config.baseURL).toBe('https://api.example.com');
      expect(config.apiKey).toBe('test-key');
      expect(config.headers?.['Custom-Header']).toBe('value');
    });

    it('should accept partial config', () => {
      const config: RAGConfig = {
        baseURL: 'https://api.example.com'
      };
      expect(config.baseURL).toBe('https://api.example.com');
    });
  });
}); 