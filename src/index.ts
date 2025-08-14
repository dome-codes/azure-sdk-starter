export { RAGClient, RAGSDK } from './sdk';
export type {
    ChunkRequest, CompletionRequest,
    EmbeddingRequest, RAGConfig, SummarizeRequest
} from './sdk';

// Export auth types and classes
export { AuthManager } from './auth';
export type { AuthConfig, TokenResponse } from './auth';

// Export Azure OpenAI SDK
export { AzureOpenAISDK, AzureOpenAIClient } from './azure-openai-sdk';
export type { 
    AzureOpenAIConfig, 
    ChatCompletionRequest, 
    EmbeddingRequest as AzureEmbeddingRequest, 
    CompletionRequest as AzureCompletionRequest 
} from './azure-openai-sdk';

// Export generated types and functions
export * from './generated/default/default';
export * from './generated/schemas';

