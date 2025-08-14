# RAG SDK - Retrieval-Augmented Generation SDK

Ein TypeScript/JavaScript SDK für Retrieval-Augmented Generation (RAG) Services, das als **einheitlicher Proxy** für Azure OpenAI und eigene APIs fungiert.

## 🎯 Konzept

Das RAG SDK ist ein **intelligenter Proxy**, der:
- **OAuth2-Authentifizierung** mit Username/Passwort handhabt
- **Azure OpenAI-kompatible API-Endpunkte** verwendet (`/chat/completions`, `/embeddings`)
- **Deine Backend-API** als Proxy für Azure OpenAI nutzt
- **Identische Request/Response-Formate** zu Azure OpenAI bereitstellt

## 🚀 Features

### 🔐 Einheitliche Authentifizierung
- **Username/Passwort-Authentifizierung** über OAuth2
- **Automatische Token-Verwaltung** mit Refresh-Logik
- **Einmalige Anmeldung** für alle Services
- **Bearer-Token** wird automatisch für alle API-Calls verwendet

### 🤖 Azure OpenAI-kompatible API
- **Identische Endpunkte** zu Azure OpenAI (`/chat/completions`, `/embeddings`)
- **Gleiche Request/Response-Formate** wie Azure OpenAI
- **Dein Backend** leitet Calls an Azure OpenAI weiter
- **Transparente Nutzung** - du verwendest die gleichen API-Aufrufe wie bei Azure OpenAI

### 🛠️ RAG-Funktionalitäten
- **Text Completion** - Generierung von Antworten (über `/chat/completions`)
- **Embeddings** - Vektorisierung von Texten (über `/embeddings`)
- **Text Chunking** - Aufteilung langer Texte (über `/chunk`)
- **Text Summarization** - Zusammenfassung von Inhalten (über `/summarize`)

## 📦 Installation

```bash
npm install rag-sdk
```

## 🔧 Konfiguration

### Einheitliche Konfiguration (Empfohlen)

```typescript
import { RAGSDK } from 'rag-sdk';

const rag = new RAGSDK({
  // Azure OpenAI Konfiguration (erforderlich)
  endpoint: 'https://your-resource.openai.azure.com/',
  apiKey: 'your-azure-api-key',
  
  // Optionale Azure-Parameter (werden im Backend gesetzt falls nicht angegeben)
  deploymentName: 'gpt-4',
  embeddingDeploymentName: 'text-embedding-ada-002',
  apiVersion: '2024-02-15-preview',
  
  // OAuth2-Authentifizierung für RAG-spezifische Features (optional)
  username: 'your-username',
  password: 'your-password',
  baseURL: 'https://your-rag-endpoint.com'
});
```

### Nur Azure OpenAI (ohne RAG-Features)

```typescript
const rag = new RAGSDK({
  endpoint: 'https://your-resource.openai.azure.com/',
  apiKey: 'your-azure-api-key'
  // deploymentName, embeddingDeploymentName und apiVersion werden im Backend gesetzt
});
```

### Mit Managed Identity (für Azure-Umgebungen)

```typescript
const rag = new RAGSDK({
  endpoint: 'https://your-resource.openai.azure.com/',
  useManagedIdentity: true
  // deploymentName, embeddingDeploymentName und apiVersion werden im Backend gesetzt
});
```

## 💻 Verwendung

### Einfache Verwendung

```typescript
// 1. SDK initialisieren
const rag = new RAGSDK({
  endpoint: 'https://your-resource.openai.azure.com/',
  apiKey: 'your-azure-api-key',
  deploymentName: 'gpt-4'
});

// 2. API-Calls - direkt über Azure OpenAI
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre mir RAG',
  max_tokens: 300,
  temperature: 0.7
});

console.log(completion.choices[0].message.content);
```

### Alle verfügbaren API-Calls

```typescript
// Text Completion (direkt über Azure OpenAI)
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre RAG',
  max_tokens: 300,
  temperature: 0.7
});

// Embeddings (direkt über Azure OpenAI)
const embedding = await rag.rag.createEmbeddings({
  input: 'Text für Embeddings',
  model: 'text-embedding-ada-002'
});

// Text chunking (eigene RAG-API über dein Backend)
const chunks = await rag.rag.chunkText({
  text: 'Langer Text...',
  chunk_size: 100,
  overlap: 20
});

// Text Summarization (eigene RAG-API über dein Backend)
const summary = await rag.rag.summarizeText({
  text: 'Langer Text...',
  max_length: 100
});
```

### Direkter Zugriff auf Azure OpenAI Client

```typescript
// Hole den Azure OpenAI Client für erweiterte Features
const azureClient = rag.rag.getAzureClient();

// Verwende Azure OpenAI Client direkt
const chatCompletion = await azureClient.generateChatCompletion({
  messages: [
    { role: 'system', content: 'Du bist ein hilfreicher Assistent.' },
    { role: 'user', content: 'Erkläre RAG' }
  ],
  maxTokens: 300
});
```

### Azure OpenAI-kompatible Response-Formate

```typescript
// Completion Response (identisch zu Azure OpenAI)
const completion = await rag.rag.generateCompletion({
  prompt: 'Erkläre RAG'
});

// Response-Format: { choices: [{ message: { content: string } }], usage: {...} }
console.log(completion.choices[0].message.content);

// Embedding Response (identisch zu Azure OpenAI)
const embedding = await rag.rag.createEmbeddings({
  input: 'Text für Embeddings'
});

// Response-Format: { data: [{ embedding: number[], index: number }], usage: {...} }
console.log(embedding.data[0].embedding);
```

### Token-Status prüfen

```typescript
// Prüfe den aktuellen Token-Status
const status = rag.getTokenStatus();
console.log('Token gültig bis:', status.expiresAt);
console.log('Token läuft bald ab:', status.isExpiringSoon);

// Tokens löschen
rag.clearTokens();
```

## 🔐 Umgebungsvariablen

```bash
# OAuth2-Authentifizierung
RAG_USERNAME=your-username
RAG_PASSWORD=your-password

# Azure OpenAI Backend (optional)
AZURE_DEPLOYMENT=gpt-4
AZURE_API_VERSION=2024-02-15-preview

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

# Linting
npm run lint
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

1. **Konfiguration**: SDK erstellt Azure OpenAI Client mit deinen Credentials
2. **API-Call**: Du rufst `rag.rag.generateCompletion()` auf
3. **Direkter Aufruf**: SDK leitet Call direkt an Azure OpenAI weiter
4. **Response**: Du bekommst das identische Response-Format wie von Azure OpenAI
5. **Transparenz**: Du verwendest die gleiche API wie Azure OpenAI, aber mit vereinfachter Konfiguration

## 🆚 Unterschied zu Azure OpenAI

| Aspekt | Azure OpenAI | RAG SDK |
|--------|--------------|---------|
| **Konfiguration** | Komplexe Setup | Einfache Konfiguration |
| **API-Calls** | Direkt | Direkt (über SDK) |
| **Request-Format** | Identisch | Identisch |
| **Response-Format** | Identisch | Identisch |
| **Deployment** | Direkt konfiguriert | Direkt konfiguriert |
| **Authentifizierung** | API-Key/Managed Identity | API-Key/Managed Identity |
| **Zusätzliche Features** | Keine | RAG-spezifische Features (optional) |

## 🎯 Vorteile des neuen Ansatzes

- **Keine HTTP-Proxy-Layer** - direkte Kommunikation mit Azure OpenAI
- **Bessere Performance** - keine zusätzlichen Netzwerk-Hops
- **Einfachere Konfiguration** - nur Azure OpenAI Parameter
- **Vollständige Azure OpenAI Kompatibilität** - alle Features verfügbar
- **Optionale RAG-Features** - nur wenn benötigt

## 📚 Beispiele

- **`example-unified.ts`** - Vereinigte Proxy-Architektur

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