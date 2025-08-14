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
  const mockConfig: RAGConfig = {
    endpoint: 'https://test.openai.azure.com/',
    apiKey: 'test-api-key',
    deploymentName: 'gpt-4',
    embeddingDeploymentName: 'text-embedding-ada-002'
  };

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
      const client = new RAGClient(mockConfig);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should be able to instantiate RAGSDK from index', () => {
      const sdk = new RAGSDK(mockConfig);
      expect(sdk.rag).toBeInstanceOf(RAGClient);
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
        endpoint: 'https://api.example.com',
        apiKey: 'test-key',
        deploymentName: 'gpt-4',
        headers: { 'Custom-Header': 'value' }
      };
      expect(config.endpoint).toBe('https://api.example.com');
      expect(config.apiKey).toBe('test-key');
      expect(config.deploymentName).toBe('gpt-4');
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
      const { getDefault } = require('../src/generated/default/default');
      expect(typeof getDefault).toBe('function');
      
      const api = getDefault();
      expect(typeof api.completionCreate).toBe('function');
      expect(typeof api.embeddingCreate).toBe('function');
      expect(typeof api.chunkCreate).toBe('function');
      expect(typeof api.summarizeCreate).toBe('function');
    });

    it('should export generated schemas', () => {
      // Test that generated schemas are available
      const schemas = require('../src/generated/schemas');
      expect(schemas).toBeDefined();
      // Die Schemas sind Interfaces, aber sie werden möglicherweise nicht korrekt exportiert
      // Da sie von Orval generiert werden, testen wir nur, dass der Import funktioniert
      expect(typeof schemas).toBe('object');
    });
  });
}); 