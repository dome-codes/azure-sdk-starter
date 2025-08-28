import {
    ChunkRequest,
    RAGConfig,
    SummarizeRequest
} from '../src';

describe('TypeScript Types and Interfaces', () => {
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
        username: 'test-user',
        password: 'test-pass',
        baseURL: 'https://test.com'
      };
      expect(config.username).toBe('test-user');
      expect(config.password).toBe('test-pass');
      expect(config.baseURL).toBe('https://test.com');
    });

    it('should accept partial config', () => {
      const config: RAGConfig = {
        baseURL: 'https://test.com'
      };
      expect(config.baseURL).toBe('https://test.com');
    });
  });
}); 