# RAG SDK - Retrieval-Augmented Generation SDK

Ein TypeScript/JavaScript SDK für Retrieval-Augmented Generation (RAG) Services, das als **einheitlicher Proxy** für Azure OpenAI und eigene APIs fungiert.

## 🎯 Konzept

Das RAG SDK ist ein **intelligenter Proxy**, der:
- **OAuth2-Authentifizierung** mit Username/Passwort handhabt
- **Azure OpenAI** als Backend verwendet (falls konfiguriert)
- **Eigene RAG-APIs** als Fallback nutzt
- **Automatisch entscheidet**, welche API für welche Anfrage verwendet wird

## 🚀 Features

### 🔐 Einheitliche Authentifizierung
- **Username/Passwort-Authentifizierung** über OAuth2
- **Automatische Token-Verwaltung** mit Refresh-Logik
- **Einmalige Anmeldung** für alle Services
- **Bearer-Token** wird automatisch für alle API-Calls verwendet

### 🤖 Intelligente API-Auswahl
- **Azure OpenAI Backend** für Completions und Embeddings (falls verfügbar)
- **Eigene RAG-API** als Fallback und für spezielle Features
- **Automatische Entscheidung** zwischen Backends
- **Transparente Nutzung** - du musst dich nicht um Backend-Details kümmern

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

### Einheitliche Konfiguration (Empfohlen)

```typescript
import { RAGSDK } from 'rag-sdk';

const rag = new RAGSDK({
  // OAuth2-Authentifizierung
  username: 'your-username',
  password: 'your-password',
  authUrl: 'https://login.microsoftonline.com/your-tenant-id',
  clientId: 'your-client-id',
  scope: 'openid profile email',
  
  // Azure OpenAI Backend (optional)
  azureEndpoint: 'https://your-resource.openai.azure.com/',
  azureDeploymentName: 'gpt-4',
  azureEmbeddingDeploymentName: 'text-embedding-ada-002',
  
  // Eigene API (Fallback)
  baseURL: 'https://your-rag-endpoint.com'
});
```

### Nur eigene API (ohne Azure OpenAI)

```typescript
const rag = new RAGSDK({
  username: 'your-username',
  password: 'your-password',
  authUrl: 'https://login.microsoftonline.com/your-tenant-id',
  clientId: 'your-client-id',
  baseURL: 'https://your-rag-endpoint.com'
});
```

### Fallback zu API-Key

```typescript
const rag = new RAGSDK({
  apiKey: 'your-api-key',
  baseURL: 'https://your-rag-endpoint.com'
});
```

## 💻 Verwendung

### Einfache Verwendung

```typescript
// 1. SDK initialisieren
const rag = new RAGSDK({
  username: 'user@company.com',
  password: 'password123',
  clientId: 'your-app-id',
  azureEndpoint: 'https://your-resource.openai.azure.com/',
  azureDeploymentName: 'gpt-4'
});

// 2. Authentifizieren (holt Bearer-Token)
await rag.authenticate();

// 3. API-Calls - SDK entscheidet automatisch zwischen Azure OpenAI und eigener API
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre mir RAG',
  max_tokens: 300,
  temperature: 0.7
});

console.log(completion.result);
```

### Automatische Backend-Auswahl

```typescript
// Das SDK entscheidet automatisch:
// - Azure OpenAI für Completions/Embeddings (falls konfiguriert)
// - Eigene API für Chunking/Summarization
// - Fallback zu eigener API bei Azure OpenAI Fehlern

// Completion (Azure OpenAI oder eigene API)
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre RAG'
});

// Embeddings (Azure OpenAI oder eigene API)
const embedding = await rag.rag.createEmbeddings({
  input: 'Text für Embeddings'
});

// Text Chunking (immer eigene API)
const chunks = await rag.rag.chunkText({
  text: 'Langer Text...',
  chunk_size: 100
});

// Text Summarization (immer eigene API)
const summary = await rag.rag.summarizeText({
  text: 'Langer Text...',
  max_length: 100
});
```

### Azure OpenAI Status prüfen

```typescript
// Prüfe ob Azure OpenAI verfügbar ist
const isAzureAvailable = await rag.isAzureOpenAIAvailable();
console.log('Azure OpenAI verfügbar:', isAzureAvailable);

// Hole Azure OpenAI Client direkt (falls verfügbar)
if (isAzureAvailable) {
  const azureClient = await rag.getAzureClient();
  // Verwende Azure OpenAI Client direkt für spezielle Anwendungsfälle
}
```

## 🔐 Umgebungsvariablen

```bash
# OAuth2-Authentifizierung
RAG_USERNAME=your-username
RAG_PASSWORD=your-password
RAG_CLIENT_ID=your-client-id

# Azure OpenAI Backend (optional)
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002

# Eigene API
RAG_API_URL=https://your-rag-endpoint.com

# Fallback API-Key
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
- **Auth Manager**: 100% ✅
- **RAG SDK**: 100% ✅
- **Azure OpenAI Integration**: 100% ✅

## 🏗️ Architektur

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Deine App     │    │    RAG SDK       │    │   Backends      │
│                 │    │   (Proxy)        │    │                 │
│ username/pass   │───▶│  OAuth2 Auth     │───▶│ Azure OpenAI    │
│                 │    │  Token Mgmt      │    │                 │
│ API Calls       │───▶│  Auto Backend    │───▶│ Eigene RAG API  │
│                 │    │  Selection       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔄 Funktionsweise

1. **Authentifizierung**: SDK holt Bearer-Token mit Username/Passwort
2. **API-Call**: Du rufst `rag.rag.generateCompletion()` auf
3. **Backend-Entscheidung**: SDK prüft Azure OpenAI Verfügbarkeit
4. **Azure OpenAI**: Falls verfügbar, leitet SDK Call an Azure weiter
5. **Fallback**: Bei Fehlern oder fehlender Konfiguration → eigene API
6. **Transparenz**: Du bekommst immer das gleiche Ergebnis-Format

## 📚 Beispiele

- **`example.ts`** - Grundlegende RAG-Funktionalitäten
- **`example-azure.ts`** - Azure OpenAI Integration
- **`example-unified.ts`** - 🆕 Vereinigte Proxy-Architektur

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