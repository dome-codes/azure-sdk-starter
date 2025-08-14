# RAG SDK - Retrieval-Augmented Generation SDK

Ein TypeScript/JavaScript SDK für Retrieval-Augmented Generation (RAG) Services, basierend auf dem offiziellen Azure OpenAI SDK.

## 🚀 Features

### 🔐 Authentifizierung
- **Username/Passwort-Authentifizierung** über OAuth2
- **Automatische Token-Verwaltung** mit Refresh-Logik
- **Azure OpenAI Integration** mit offiziellem SDK
- **Managed Identity Support** für Azure-Umgebungen
- **Fallback zu API-Key** für einfache Anwendungen

### 🤖 Azure OpenAI Integration
- **Chat Completions** mit GPT-4, GPT-3.5 und anderen Modellen
- **Text Completions** für ältere Modelle
- **Embeddings** mit text-embedding-ada-002 und anderen
- **Deployment-Management** für verschiedene Modelle
- **Vollständige Azure OpenAI SDK-Integration**

### 🛠️ RAG-Funktionalitäten
- **Text Completion** - Generierung von Antworten
- **Embeddings** - Vektorisierung von Texten
- **Text Chunking** - Aufteilung langer Texte
- **Text Summarization** - Zusammenfassung von Inhalten

## 📦 Installation

```bash
npm install rag-sdk
```

## 🔧 Konfiguration

### 1. Azure OpenAI (Empfohlen)

```typescript
import { AzureOpenAISDK } from 'rag-sdk';

const azureOpenAI = new AzureOpenAISDK({
  endpoint: 'https://your-resource.openai.azure.com/',
  apiKey: 'your-azure-api-key',
  deploymentName: 'gpt-4',
  embeddingDeploymentName: 'text-embedding-ada-002'
});
```

### 2. Mit Managed Identity (Azure-Umgebungen)

```typescript
const azureOpenAI = new AzureOpenAISDK({
  endpoint: 'https://your-resource.openai.azure.com/',
  useManagedIdentity: true,
  deploymentName: 'gpt-4'
});
```

### 3. Username/Passwort-Authentifizierung

```typescript
import { RAGSDK } from 'rag-sdk';

const rag = new RAGSDK({
  username: 'your-username',
  password: 'your-password',
  authUrl: 'https://login.microsoftonline.com/your-tenant-id',
  clientId: 'your-client-id'
});
```

### 4. API-Key Fallback

```typescript
const rag = new RAGSDK({
  apiKey: 'your-api-key'
});
```

## 💻 Verwendung

### Azure OpenAI Chat Completions

```typescript
// Chat mit System-Message
const chatResult = await azureOpenAI.chatCompletion({
  messages: [
    {
      role: 'system',
      content: 'Du bist ein hilfreicher Assistent.'
    },
    {
      role: 'user',
      content: 'Erkläre mir RAG'
    }
  ],
  maxTokens: 300,
  temperature: 0.7
});

console.log(chatResult.choices[0]?.message?.content);
```

### Azure OpenAI Embeddings

```typescript
const embeddingResult = await azureOpenAI.embeddings({
  input: 'Text für Embeddings',
  model: 'text-embedding-ada-002'
});

console.log(embeddingResult.data[0]?.embedding);
```

### Deployment wechseln

```typescript
// Wechsle zu einem anderen Modell
azureOpenAI.setDeployment('gpt-35-turbo');

// Wechsle Embedding-Modell
azureOpenAI.setEmbeddingDeployment('custom-embedding-model');
```

### RAG-Funktionalitäten

```typescript
// Text Completion
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre RAG in einfachen Worten',
  max_tokens: 300,
  temperature: 0.7
});

// Embeddings
const embedding = await rag.rag.createEmbeddings({
  input: 'Text für Embeddings',
  model: 'text-embedding-ada-002'
});

// Text Chunking
const chunks = await rag.rag.chunkText({
  text: 'Langer Text...',
  chunk_size: 100,
  overlap: 20
});

// Text Summarization
const summary = await rag.rag.summarizeText({
  text: 'Langer Text...',
  max_length: 100
});
```

## 🔐 Umgebungsvariablen

```bash
# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_KEY=your-azure-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# OAuth2 (für Username/Passwort)
RAG_USERNAME=your-username
RAG_PASSWORD=your-password
RAG_CLIENT_ID=your-client-id

# API-Key Fallback
RAG_API_KEY=your-api-key
```

## 🧪 Tests

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus
npm run test:watch

# Tests mit Coverage
npm run test:coverage
```

## 📊 Test-Coverage

- **Gesamt-Coverage**: 100% ✅
- **Azure OpenAI SDK**: 100% ✅
- **Auth Manager**: 100% ✅
- **RAG SDK**: 100% ✅

## 🏗️ Architektur

```
src/
├── auth.ts                 # OAuth2-Authentifizierung
├── sdk.ts                  # RAG-SDK mit Auth-Integration
├── azure-openai-sdk.ts     # Azure OpenAI SDK-Integration
├── index.ts                # Haupt-Exports
└── generated/              # Generierte OpenAPI-Typen
```

## 🔗 Abhängigkeiten

- **@azure/openai**: Offizielles Azure OpenAI SDK
- **@azure/identity**: Azure Identity für Managed Identity
- **axios**: HTTP-Client für REST-APIs
- **TypeScript**: Vollständige TypeScript-Unterstützung

## 📚 Beispiele

Siehe `example.ts` und `example-azure.ts` für vollständige Beispiele.

## 🤝 Beitragen

1. Fork das Repository
2. Erstelle einen Feature-Branch
3. Committe deine Änderungen
4. Push zum Branch
5. Erstelle einen Pull Request

## 📄 Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## 🔗 Links

- [Azure OpenAI Service](https://azure.microsoft.com/en-us/services/cognitive-services/openai-service/)
- [Azure OpenAI SDK](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/openai/openai)
- [Azure Identity](https://github.com/Azure/azure-sdk-for-js/tree/main/sdk/identity/identity) 