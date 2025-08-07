import { RAGSDK } from './dist';

// RAG SDK initialisieren
const rag = new RAGSDK({
  baseURL: 'https://your-rag-endpoint.com',
  apiKey: process.env.RAG_API_KEY || 'your-api-key-here'
});

async function example() {
  try {
    // 1. Text Completion
    console.log('=== Text Completion ===');
    const completion = await rag.rag.generateCompletion({
      prompt: "Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation) in einfachen Worten",
      max_tokens: 300,
      temperature: 0.7
    });
    console.log('Completion:', completion.result);

    // 2. Embeddings erstellen
    console.log('\n=== Embeddings ===');
    const embedding = await rag.rag.createEmbeddings({
      input: "Dies ist ein Beispieltext für Embeddings",
      model: "text-embedding-ada-002"
    });
    console.log('Embedding Vector:', embedding.vector?.slice(0, 5), '...');

    // 3. Text chunking
    console.log('\n=== Text Chunking ===');
    const longText = `
      Dies ist ein sehr langer Text, der in kleinere Stücke aufgeteilt werden soll. 
      RAG (Retrieval-Augmented Generation) ist eine Technik, die es ermöglicht, 
      Large Language Models mit externen Wissensquellen zu erweitern. 
      Dabei werden relevante Dokumente oder Informationen aus einer Datenbank 
      abgerufen und dem Modell als Kontext zur Verfügung gestellt.
    `;
    
    const chunks = await rag.rag.chunkText({
      text: longText,
      chunk_size: 100,
      overlap: 20
    });
    console.log('Anzahl Chunks:', chunks.total_chunks);
    console.log('Erster Chunk:', chunks.chunks?.[0]?.text);

    // 4. Text zusammenfassen
    console.log('\n=== Text Summarization ===');
    const summary = await rag.rag.summarizeText({
      text: longText,
      max_length: 100
    });
    console.log('Summary:', summary.summary);

  } catch (error) {
    console.error('Fehler:', error);
  }
}

// Beispiel ausführen
example(); 