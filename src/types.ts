// Common Types for the entire SDK

// ===== AUTHENTICATION TYPES =====
export interface AuthConfig {
  username: string;
  password: string;
  authUrl?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

// ===== MODEL TYPES =====

/**
 * Supported model types for different AI operations
 */
export enum ModelType {
  /** GPT-4 model for text generation */
  GPT_4 = 'gpt-4',
  /** GPT-3.5 Turbo model for text generation */
  GPT_3_5_TURBO = 'gpt-3.5-turbo',
  /** GPT-4 Turbo model for text generation */
  GPT_4_TURBO = 'gpt-4-turbo',
  /** Text embedding model Ada 002 */
  TEXT_EMBEDDING_ADA_002 = 'text-embedding-ada-002',
  /** Text embedding model 3 Small */
  TEXT_EMBEDDING_3_SMALL = 'text-embedding-3-small',
  /** Text embedding model 3 Large */
  TEXT_EMBEDDING_3_LARGE = 'text-embedding-3-large'
}

/**
 * Response format options for API calls
 */
export enum ResponseFormat {
  /** Plain text response */
  TEXT = 'text',
  /** JSON formatted response */
  JSON = 'json',
  /** XML formatted response */
  XML = 'xml',
  /** URL response for images */
  URL = 'url',
  /** Base64 encoded response for images */
  B64_JSON = 'b64_json'
}

/**
 * Image quality options
 */
export enum Quality {
  /** Standard quality */
  STANDARD = 'standard',
  /** High definition quality */
  HD = 'hd'
}

/**
 * Image style options
 */
export enum Style {
  /** Vivid style */
  VIVID = 'vivid',
  /** Natural style */
  NATURAL = 'natural'
}

/**
 * Image size options
 */
export enum Size {
  /** 256x256 pixels */
  SIZE_256 = '256x256',
  /** 512x512 pixels */
  SIZE_512 = '512x512',
  /** 1024x1024 pixels */
  SIZE_1024 = '1024x1024',
  /** 1792x1024 pixels */
  SIZE_1792 = '1792x1024',
  /** 1024x1792 pixels */
  SIZE_1024_1792 = '1024x1792'
}

/**
 * Completion finish reasons
 */
export enum FinishReason {
  /** Normal completion */
  STOP = 'stop',
  /** Reached token limit */
  LENGTH = 'length',
  /** Content filter triggered */
  CONTENT_FILTER = 'content_filter',
  /** Function call requested */
  FUNCTION_CALL = 'function_call'
}

/**
 * Message roles for chat completion
 */
export enum Role {
  /** System message */
  SYSTEM = 'system',
  /** User message */
  USER = 'user',
  /** Assistant message */
  ASSISTANT = 'assistant',
  /** Function message */
  FUNCTION = 'function'
}

// ===== API RESPONSE TYPES =====

/**
 * Response from text completion API
 */
export interface CompletionResponse {
  /** Unique identifier for the completion */
  id: string;
  /** Object type */
  object: string;
  /** Creation timestamp */
  created: number;
  /** Model used for completion */
  model: string;
  /** Array of completion choices */
  choices: Array<{
    /** Choice index */
    index: number;
    /** Generated message */
    message: {
      /** Message role */
      role: Role;
      /** Message content */
      content: string;
    };
    /** Reason for completion */
    finish_reason: FinishReason;
  }>;
  /** Token usage information */
  usage: {
    /** Number of prompt tokens */
    prompt_tokens: number;
    /** Number of completion tokens */
    completion_tokens: number;
    /** Total number of tokens */
    total_tokens: number;
  };
}

/**
 * Response from embeddings API
 */
export interface EmbeddingResponse {
  /** Object type */
  object: string;
  /** Array of embedding data */
  data: Array<{
    /** Object type */
    object: string;
    /** Embedding index */
    index: number;
    /** Embedding vector */
    embedding: number[];
  }>;
  /** Model used for embeddings */
  model: string;
  /** Token usage information */
  usage: {
    /** Number of prompt tokens */
    prompt_tokens: number;
    /** Total number of tokens */
    total_tokens: number;
  };
}

/**
 * Response from image generation API
 */
export interface ImageGenerationResponse {
  /** Creation timestamp */
  created: number;
  /** Array of generated images */
  data: Array<{
    /** Image URL */
    url?: string;
    /** Base64 encoded image */
    b64_json?: string;
  }>;
}

// ===== API REQUEST TYPES =====

/**
 * Request parameters for text completion
 */
export interface CompletionRequest {
  /** Array of messages for chat completion */
  messages: Array<{
    /** Message role */
    role: Role;
    /** Message content */
    content: string;
  }>;
  /** Model to use for completion */
  model?: ModelType;
  /** Maximum number of tokens to generate */
  max_tokens?: number;
  /** Sampling temperature (0-2) */
  temperature?: number;
  /** Nucleus sampling parameter */
  top_p?: number;
  /** Frequency penalty */
  frequency_penalty?: number;
  /** Presence penalty */
  presence_penalty?: number;
  /** Stop sequences */
  stop?: string | string[];
  /** Enable streaming */
  stream?: boolean;
  /** Response format */
  response_format?: ResponseFormat;
}

/**
 * Request parameters for embeddings
 */
export interface EmbeddingRequest {
  /** Input text(s) to embed */
  input: string | string[];
  /** Model to use for embeddings */
  model?: ModelType;
  /** Input type */
  input_type?: string;
  /** Encoding format */
  encoding_format?: string;
  /** Embedding dimension */
  dimension?: number;
}

/**
 * Request parameters for image generation
 */
export interface ImageGenerationRequest {
  /** Text description of the desired image */
  prompt: string;
  /** Model to use for generation */
  model?: ModelType;
  /** Image quality */
  quality?: Quality;
  /** Image style */
  style?: Style;
  /** Response format */
  response_format?: ResponseFormat;
  /** Image size */
  size?: Size;
  /** Number of images to generate */
  n?: number;
}

// ===== CHUNKING TYPES =====

/**
 * Request parameters for text chunking
 */
export interface ChunkRequest {
  /** Text to chunk */
  text: string;
  /** Size of each chunk */
  chunk_size?: number;
  /** Overlap between chunks */
  overlap?: number;
  /** Chunking method */
  method?: 'sentences' | 'words' | 'characters';
  /** Preserve formatting */
  preserve_formatting?: boolean;
}

/**
 * Response from text chunking
 */
export interface ChunkResponse {
  /** Array of text chunks */
  chunks: string[];
  /** Chunking metadata */
  metadata: {
    /** Total number of chunks */
    total_chunks: number;
    /** Size of each chunk */
    chunk_size: number;
    /** Overlap between chunks */
    overlap: number;
    /** Method used for chunking */
    method: string;
    /** Whether formatting was preserved */
    preserve_formatting: boolean;
  };
}

// ===== SUMMARIZATION TYPES =====

/**
 * Request parameters for text summarization
 */
export interface SummarizeRequest {
  /** Text to summarize */
  text: string;
  /** Maximum length of summary */
  max_length?: number;
  /** Summary style */
  style?: 'concise' | 'detailed' | 'bullet_points';
  /** Target language */
  language?: string;
  /** Include key points */
  include_key_points?: boolean;
}

/**
 * Response from text summarization
 */
export interface SummarizeResponse {
  /** Generated summary */
  summary: string;
  /** Summary metadata */
  metadata: {
    /** Original text length */
    original_length: number;
    /** Summary length */
    summary_length: number;
    /** Compression ratio */
    compression_ratio: number;
    /** Style used */
    style: string;
    /** Language used */
    language: string;
  };
}

// ===== CONFIGURATION TYPES =====

/**
 * Configuration for the RAG SDK
 */
export interface RAGConfig {
  /** Username for OAuth2 authentication */
  username?: string;
  /** Password for OAuth2 authentication */
  password?: string;
  /** Base URL for the RAG API */
  baseURL?: string;
  /** Azure deployment name (passed as header) */
  deploymentName?: string;
  /** Azure API version (passed as header) */
  apiVersion?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retries */
  maxRetries?: number;
  /** Delay between retries in milliseconds */
  retryDelay?: number;
  /** Logging level */
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  /** Enable logging */
  enableLogging?: boolean;
}

// ===== ERROR TYPES =====

/**
 * Custom error for RAG SDK operations
 */
export class RAGError extends Error {
  /** HTTP status code */
  public statusCode: number;
  /** Error code */
  public code: string;
  /** Additional error details */
  public details?: any;

  constructor(message: string, statusCode: number = 500, code: string = 'RAG_ERROR', details?: any) {
    super(message);
    this.name = 'RAGError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Error response from API
 */
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code */
  code: string;
  /** HTTP status code */
  status: number;
  /** Additional error details */
  details?: any;
}
