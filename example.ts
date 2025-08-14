import { RAGSDK } from './dist';

// Beispiel 1: Username/Passwort-Authentifizierung (empfohlen)
async function exampleWithAuth() {
  console.log('=== RAG SDK mit Username/Passwort-Authentifizierung ===');
  
  const rag = new RAGSDK({
    baseURL: 'https://your-rag-endpoint.com',
    username: process.env.RAG_USERNAME || 'your-username',
    password: process.env.RAG_PASSWORD || 'your-password',
    authUrl: 'https://login.microsoftonline.com/your-tenant-id',
    clientId: process.env.RAG_CLIENT_ID || 'your-client-id',
    scope: 'openid profile email'
  });

  try {
    // Automatische Authentifizierung
    console.log('🔐 Authentifiziere...');
    const token = await rag.authenticate();
    console.log('✅ Authentifizierung erfolgreich!');
    
    // Token-Status anzeigen
    const status = rag.getTokenStatus();
    console.log('📊 Token-Status:', status);

    // API-Calls - Token wird automatisch verwaltet
    console.log('\n🚀 Führe API-Calls aus...');
    
    // 1. Text Completion
    console.log('📝 Generiere Completion...');
    const completion = await rag.rag.generateCompletion({
      prompt: "Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation) in einfachen Worten",
      max_tokens: 300,
      temperature: 0.7
    });
    console.log('✅ Completion:', completion.result);

    // 2. Embeddings erstellen
    console.log('\n🔢 Erstelle Embeddings...');
    const embedding = await rag.rag.createEmbeddings({
      input: "Dies ist ein Beispieltext für Embeddings",
      model: "text-embedding-ada-002"
    });
    console.log('✅ Embedding Vector:', embedding.vector?.slice(0, 5), '...');

    // 3. Text chunking
    console.log('\n✂️ Chunking Text...');
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
    console.log('✅ Anzahl Chunks:', chunks.total_chunks);
    console.log('✅ Erster Chunk:', chunks.chunks?.[0]?.text);

    // 4. Text zusammenfassen
    console.log('\n📋 Fasse Text zusammen...');
    const summary = await rag.rag.summarizeText({
      text: longText,
      max_length: 100
    });
    console.log('✅ Summary:', summary.summary);

    // Token-Status nach den Calls
    const finalStatus = rag.getTokenStatus();
    console.log('\n📊 Finaler Token-Status:', finalStatus);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel 2: Fallback mit API-Key (für einfache Anwendungen)
async function exampleWithAPIKey() {
  console.log('\n=== RAG SDK mit API-Key (Fallback) ===');
  
  const rag = new RAGSDK({
    baseURL: 'https://your-rag-endpoint.com',
    apiKey: process.env.RAG_API_KEY || 'your-api-key-here'
  });

  try {
    console.log('🔑 Verwende API-Key...');
    
    // Einfacher API-Call
    const completion = await rag.rag.generateCompletion({
      prompt: "Kurze Erklärung von RAG",
      max_tokens: 100
    });
    console.log('✅ Completion:', completion.result);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel 3: Token-Management
async function exampleTokenManagement() {
  console.log('\n=== Token-Management Demo ===');
  
  const rag = new RAGSDK({
    baseURL: 'https://your-rag-endpoint.com',
    username: 'demo-user',
    password: 'demo-pass',
    clientId: 'demo-client'
  });

  try {
    // Initialer Token-Status
    console.log('📊 Initialer Status:', rag.getTokenStatus());
    
    // Authentifizierung
    const token = await rag.authenticate();
    console.log('🔐 Token erhalten:', token ? 'Ja' : 'Nein');
    
    // Status nach Auth
    console.log('📊 Status nach Auth:', rag.getTokenStatus());
    
    // Token löschen
    rag.clearTokens();
    console.log('🗑️ Tokens gelöscht');
    
    // Status nach Löschung
    console.log('📊 Status nach Löschung:', rag.getTokenStatus());
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 RAG SDK Beispiele\n');
  
  // Beispiel 1: Username/Passwort (empfohlen)
  await exampleWithAuth();
  
  // Beispiel 2: API-Key Fallback
  await exampleWithAPIKey();
  
  // Beispiel 3: Token-Management
  await exampleTokenManagement();
  
  console.log('\n✨ Alle Beispiele abgeschlossen!');
}

// Beispiel ausführen
main().catch(console.error); 