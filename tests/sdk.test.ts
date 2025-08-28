import { RAGClient, RAGSDK } from '../src/sdk';

// Mock axios
const mockAxios = {
  post: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxios)
}));

describe('RAGSDK', () => {
  let ragClient: RAGClient;
  let mockPost: jest.Mock;
  let mockAxiosCreate: jest.Mock;
  const baseURL = 'https://test-rag-endpoint.com';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    mockPost = jest.fn();
    mockAxiosCreate = require('axios').create as jest.Mock;
    mockAxiosCreate.mockReturnValue({ 
      post: mockPost,
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    });
    
    ragClient = new RAGClient({ baseURL });
  });

  describe('Constructor', () => {
    it('should create RAGSDK with default config', () => {
      const sdk = new RAGSDK();
      expect(sdk.rag).toBeInstanceOf(RAGClient);
    });

    it('should create RAGSDK with custom config', () => {
      const config = { baseURL: 'https://custom.com' };
      const sdk = new RAGSDK(config);
      expect(sdk.rag).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with default config', () => {
      const client = new RAGClient();
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with custom config', () => {
      const config = { baseURL: 'https://custom.com' };
      const client = new RAGClient(config);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should create RAGClient with headers', () => {
      const config = { 
        baseURL: 'https://custom.com', 
        headers: { 'Custom-Header': 'value' }
      };
      const client = new RAGClient(config);
      expect(client).toBeInstanceOf(RAGClient);
    });

    it('should configure axios with correct settings', () => {
      const config = { baseURL: 'https://test.com' };
      new RAGClient(config);
      
      expect(mockAxiosCreate).toHaveBeenCalledWith({
        baseURL: 'https://test.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });
  });

  describe('Basic Functionality', () => {
    it('should have generateCompletion method', () => {
      expect(typeof ragClient.generateCompletion).toBe('function');
    });

    it('should have createEmbeddings method', () => {
      expect(typeof ragClient.createEmbeddings).toBe('function');
    });

    it('should have generateImage method', () => {
      expect(typeof ragClient.generateImage).toBe('function');
    });
  });
}); 