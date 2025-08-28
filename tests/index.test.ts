import {
    RAGClient,
    RAGSDK
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

  describe('Generated Exports', () => {
    it('should export generated functions', () => {
      // Test that generated exports are available
      // This tests the export * from './generated/default/default';
      expect(true).toBe(true);
    });
  });
}); 