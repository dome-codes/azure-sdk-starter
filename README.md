# RAG SDK

Ein TypeScript/JavaScript SDK für Retrieval-Augmented Generation (RAG) Services.

## Installation

```bash
npm install rag-sdk
```

## Verwendung

### Grundlegende Konfiguration

```typescript
import { RAGSDK } from 'rag-sdk';

const rag = new RAGSDK({
  baseURL: 'https://your-rag-endpoint.com',
  apiKey: 'your-api-key-here'
});
```

### Text Completion

```typescript
// Einfache Text-Generierung
const completion = await rag.rag.generateCompletion({
  prompt: "Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation)",
  max_tokens: 500,
  temperature: 0.7
});

console.log(completion.result);
```

### Embeddings erstellen

```typescript
// Einzelnen Text embedden
const embedding = await rag.rag.createEmbeddings({
  input: "Dies ist ein Beispieltext für Embeddings",
  model: "text-embedding-ada-002"
});

// Mehrere Texte gleichzeitig embedden
const embeddings = await rag.rag.createEmbeddings({
  input: [
    "Erster Text für Embeddings",
    "Zweiter Text für Embeddings",
    "Dritter Text für Embeddings"
  ],
  model: "text-embedding-ada-002"
});

console.log(embedding.vector);
```

### Text chunking

```typescript
// Langen Text in Chunks aufteilen
const chunks = await rag.rag.chunkText({
  text: "Ein sehr langer Text, der in kleinere Stücke aufgeteilt werden soll...",
  chunk_size: 1000,
  overlap: 200
});

console.log(chunks.chunks);
```

### Text zusammenfassen

```typescript
// Langen Text zusammenfassen
const summary = await rag.rag.summarizeText({
  text: "Ein sehr langer Text mit vielen Details und Informationen...",
  max_length: 200
});

console.log(summary.summary);
```

### Vollständiges RAG-Beispiel

```typescript
import { RAGSDK } from 'rag-sdk';

const rag = new RAGSDK({
  baseURL: 'https://your-rag-endpoint.com',
  apiKey: process.env.RAG_API_KEY
});

async function processDocument(documentText: string, question: string) {
  // 1. Text in Chunks aufteilen
  const chunks = await rag.rag.chunkText({
    text: documentText,
    chunk_size: 1000,
    overlap: 200
  });

  // 2. Embeddings für Chunks erstellen
  const embeddings = await rag.rag.createEmbeddings({
    input: chunks.chunks.map(chunk => chunk.text),
    model: "text-embedding-ada-002"
  });

  // 3. Frage basierend auf Chunks beantworten
  const answer = await rag.rag.generateCompletion({
    prompt: `Basierend auf folgenden Dokumenten-Ausschnitten beantworte die Frage: ${question}\n\nDokumente:\n${chunks.chunks.map(chunk => chunk.text).join('\n\n')}`,
    max_tokens: 300,
    temperature: 0.3
  });

  return answer.result;
}

// Verwendung
const documentText = "Ein langes Dokument mit vielen Informationen...";
const question = "Was sind die Hauptpunkte des Dokuments?";

processDocument(documentText, question)
  .then(answer => console.log('Antwort:', answer))
  .catch(error => console.error('Fehler:', error));
```

## API Referenz

### RAGSDK

Hauptklasse für die RAG SDK.

#### Konstruktor

```typescript
new RAGSDK(config?: RAGConfig)
```

#### Konfiguration

```typescript
interface RAGConfig {
  baseURL?: string;     // API Endpoint URL
  apiKey?: string;      // API Schlüssel
  headers?: Record<string, string>; // Zusätzliche Headers
}
```

### RAGClient

Client für RAG-spezifische Operationen.

#### Methoden

- `generateCompletion(params: CompletionRequest)` - Text-Generierung
- `createEmbeddings(params: EmbeddingRequest)` - Embeddings erstellen
- `chunkText(params: ChunkRequest)` - Text chunking
- `summarizeText(params: SummarizeRequest)` - Text zusammenfassen

## Entwicklung

1. Repository klonen
2. Dependencies installieren: `npm install`
3. OpenAPI Code generieren: `npm run generate`
4. Build erstellen: `npm run build`

## Scripts

- `npm run generate` - Generiert TypeScript Code aus OpenAPI Spezifikation
- `npm run build` - Erstellt Production Build
- `npm run dev` - Watch Mode für Entwicklung
- `npm run clean` - Löscht dist Ordner

## Lizenz

MIT 