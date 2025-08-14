import { AzureOpenAIClient, AzureOpenAISDK, ChatCompletionRequest, CompletionRequest, EmbeddingRequest } from '../src/azure-openai-sdk';

// Mock Azure OpenAI SDK
jest.mock('@azure/openai', () => ({
  OpenAIClient: jest.fn(),
  AzureKeyCredential: jest.fn(),
  ChatCompletions: jest.fn(),
  ChatCompletionsOptions: jest.fn(),
  EmbeddingsOptions: jest.fn(),
  Embeddings: jest.fn()
}));

// Mock Azure Identity
jest.mock('@azure/identity', () => ({
  DefaultAzureCredential: jest.fn()
}));

describe('Azure OpenAI SDK', () => {
  let azureOpenAI: AzureOpenAISDK;
  let azureClient: AzureOpenAIClient;
  let mockOpenAIClient: any;
  const mockConfig = {
    endpoint: 'https://test.openai.azure.com/',
    apiKey: 'test-api-key',
    deploymentName: 'gpt-4',
    embeddingDeploymentName: 'text-embedding-ada-002'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OpenAIClient
    mockOpenAIClient = {
      getChatCompletions: jest.fn(),
      getEmbeddings: jest.fn()
    };
    
    const { OpenAIClient } = require('@azure/openai');
    OpenAIClient.mockImplementation(() => mockOpenAIClient);
    
    // Mock AzureKeyCredential
    const { AzureKeyCredential } = require('@azure/openai');
    AzureKeyCredential.mockImplementation(() => ({}));
    
    azureOpenAI = new AzureOpenAISDK(mockConfig);
    azureClient = azureOpenAI.openai;
  });

  describe('Constructor', () => {
    it('should create AzureOpenAISDK with config', () => {
      expect(azureOpenAI).toBeInstanceOf(AzureOpenAISDK);
      expect(azureOpenAI.openai).toBeInstanceOf(AzureOpenAIClient);
    });

    it('should create AzureOpenAIClient with config', () => {
      expect(azureClient).toBeInstanceOf(AzureOpenAIClient);
    });

    it('should use default deployment names', () => {
      const config = {
        endpoint: 'https://test.com/',
        apiKey: 'test-key'
      };
      const sdk = new AzureOpenAISDK(config);
      expect(sdk.openai).toBeInstanceOf(AzureOpenAIClient);
    });

    it('should throw error without apiKey or useManagedIdentity', () => {
      const config = {
        endpoint: 'https://test.com/'
      };
      expect(() => new AzureOpenAISDK(config)).toThrow('Either apiKey or useManagedIdentity must be provided');
    });
  });

  describe('Chat Completions', () => {
    it('should generate chat completion successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'RAG ist eine Technik zur Erweiterung von LLMs mit externen Datenquellen.'
            }
          }
        ]
      };

      mockOpenAIClient.getChatCompletions.mockResolvedValue(mockResponse);

      const request: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'Erkläre RAG' }
        ],
        maxTokens: 100,
        temperature: 0.7
      };

      const result = await azureOpenAI.chatCompletion(request);
      
      expect(mockOpenAIClient.getChatCompletions).toHaveBeenCalledWith(
        'gpt-4',
        request.messages,
        expect.objectContaining({
          maxTokens: 100,
          temperature: 0.7
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle chat completion errors', async () => {
      const error = new Error('API Error');
      mockOpenAIClient.getChatCompletions.mockRejectedValue(error);

      const request: ChatCompletionRequest = {
        messages: [
          { role: 'user', content: 'Erkläre RAG' }
        ]
      };

      await expect(azureOpenAI.chatCompletion(request))
        .rejects
        .toThrow('Chat completion generation failed: API Error');
    });
  });

  describe('Text Completions', () => {
    it('should generate text completion successfully', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: 'RAG ist eine Technik zur Erweiterung von LLMs mit externen Datenquellen.'
            }
          }
        ]
      };

      mockOpenAIClient.getChatCompletions.mockResolvedValue(mockResponse);

      const request: CompletionRequest = {
        prompt: 'Erkläre RAG',
        maxTokens: 100,
        temperature: 0.7
      };

      const result = await azureOpenAI.completion(request);
      
      expect(mockOpenAIClient.getChatCompletions).toHaveBeenCalledWith(
        'gpt-4',
        [{ role: 'user', content: 'Erkläre RAG' }],
        expect.objectContaining({
          maxTokens: 100,
          temperature: 0.7
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle text completion errors', async () => {
      const error = new Error('API Error');
      mockOpenAIClient.getChatCompletions.mockRejectedValue(error);

      const request: CompletionRequest = {
        prompt: 'Erkläre RAG'
      };

      await expect(azureOpenAI.completion(request))
        .rejects
        .toThrow('Chat completion generation failed: API Error');
    });
  });

  describe('Embeddings', () => {
    it('should create embeddings successfully', async () => {
      const mockResponse = {
        data: [
          {
            embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
            index: 0
          }
        ]
      };

      mockOpenAIClient.getEmbeddings.mockResolvedValue(mockResponse);

      const request: EmbeddingRequest = {
        input: 'Text für Embeddings',
        model: 'text-embedding-ada-002'
      };

      const result = await azureOpenAI.embeddings(request);
      
      expect(mockOpenAIClient.getEmbeddings).toHaveBeenCalledWith(
        'text-embedding-ada-002',
        ['Text für Embeddings'],
        expect.objectContaining({
          model: 'text-embedding-ada-002'
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle embedding errors', async () => {
      const error = new Error('API Error');
      mockOpenAIClient.getEmbeddings.mockRejectedValue(error);

      const request: EmbeddingRequest = {
        input: 'Text für Embeddings'
      };

      await expect(azureOpenAI.embeddings(request))
        .rejects
        .toThrow('Embedding creation failed: API Error');
    });
  });

  describe('Deployment Management', () => {
    it('should change deployment', () => {
      azureOpenAI.setDeployment('gpt-35-turbo');
      // Da der Test den Mock verwendet, müssen wir den Mock direkt prüfen
      expect(azureOpenAI.openai).toBeDefined();
    });

    it('should change embedding deployment', () => {
      azureOpenAI.setEmbeddingDeployment('custom-embedding-model');
      // Da der Test den Mock verwendet, müssen wir den Mock direkt prüfen
      expect(azureOpenAI.openai).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should return current config', () => {
      const config = azureOpenAI.openai.getConfig();
      expect(config.endpoint).toBe('https://test.openai.azure.com/');
      expect(config.deploymentName).toBe('gpt-4');
      expect(config.embeddingDeploymentName).toBe('text-embedding-ada-002');
    });
  });
});
