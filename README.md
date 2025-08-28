# RAG SDK - Azure OpenAI Integration

Ein TypeScript SDK für Retrieval-Augmented Generation (RAG) mit Azure OpenAI Integration.

## 🚀 Features

- **OAuth2 Authentifizierung** mit Username/Password
- **Azure OpenAI Integration** über Backend-Proxy
- **Text Completion** mit Chat-Format
- **Embeddings** mit verschiedenen Modellen
- **Image Generation** mit allen Optionen
- **Text Chunking** (geplant)
- **Text Summarization** (geplant)
- **Type-Safe Enums** für alle Parameter
- **Automatische Token-Verwaltung**

## 📦 Installation

```bash
npm install
npm run build
```

## 🔧 Konfiguration

```typescript
import { RAGSDK } from './dist';

const rag = new RAGSDK({
  username: 'your-username',
  password: 'your-password',
  baseURL: 'https://your-rag-endpoint.com',
  
  // Optionale Azure-Parameter
  deploymentName: 'gpt-4',
  apiVersion: '2024-02-15-preview',
  
  // Erweiterte Konfiguration
  timeout: 30000,
  maxRetries: 3,
  logLevel: 'info'
});
```

## 📚 Beispiele

Alle Beispiele findest du im `examples/` Ordner:

- `examples/example-unified.ts` - Vollständiges Beispiel mit allen Features
- `examples/env.example` - Beispiel-Umgebungsvariablen

## 📖 Dokumentation

- `docs/openai_api_sync_async.md` - Detaillierte Dokumentation zu OpenAI API Sync vs. Async

## 🧪 Tests

```bash
npm test
npm run test:coverage
```

## 🏗️ Build

```bash
npm run build
npm run clean
```

## 📁 Projektstruktur

```
├── src/
│   ├── index.ts          # Hauptexport
│   ├── sdk.ts            # RAG SDK Client
│   ├── auth.ts           # OAuth2 Authentifizierung
│   └── types.ts          # TypeScript Types & Enums
├── examples/              # Beispiel-Code
│   ├── example-unified.ts
│   └── env.example
├── docs/                  # Dokumentation
│   └── openai_api_sync_async.md
├── tests/                 # Test-Suite
└── dist/                  # Build-Output
```

## 🔐 Authentifizierung

Das SDK verwendet OAuth2 mit Username/Password:

1. **Automatische Authentifizierung** beim ersten API-Call
2. **Token-Refresh** bei Ablauf
3. **Interceptors** für automatische Token-Verwaltung

## 🌐 Azure OpenAI Integration

- **Keine direkte Azure SDK Abhängigkeit**
- **Backend-Proxy** für Azure OpenAI Calls
- **Header-basierte** Parameter-Übergabe
- **Fallback** auf eigene RAG API

## 🔗 API-Endpunkte

Alle API-Endpunkte folgen dem Pattern `/v1/ai/...`:

- **`/v1/ai/completions`** - Text Completion
- **`/v1/ai/embeddings`** - Embeddings erstellen
- **`/v1/ai/images/generations`** - Image Generation

> **Hinweis**: Chunking und Summarization sind geplant, aber noch nicht implementiert.

## 📄 Lizenz

MIT 