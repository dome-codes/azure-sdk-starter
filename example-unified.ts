import { RAGSDK } from './dist';

// Vereinheitlichtes RAG SDK Beispiel
async function unifiedRAGExample() {
  console.log('🚀 Vereinheitlichtes RAG SDK Beispiel\n');
  
  // RAG SDK mit Username/Passwort + Azure OpenAI Backend
  const rag = new RAGSDK({
    // OAuth2-Authentifizierung
    username: process.env.RAG_USERNAME || 'your-username',
    password: process.env.RAG_PASSWORD || 'your-password',
    authUrl: 'https://login.microsoftonline.com/your-tenant-id',
    clientId: process.env.RAG_CLIENT_ID || 'your-client-id',
    scope: 'openid profile email',
    
    // Azure OpenAI Backend (optional)
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com/',
    azureDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
    azureEmbeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002',
    
    // Fallback zu eigener API
    baseURL: 'https://your-rag-endpoint.com'
  });

  try {
    // 1. Authentifizierung (holt Bearer-Token)
    console.log('🔐 Authentifiziere...');
    const token = await rag.authenticate();
    console.log('✅ Authentifizierung erfolgreich!');
    
    // Token-Status anzeigen
    const status = rag.getTokenStatus();
    console.log('📊 Token-Status:', status);

    // 2. Prüfe Azure OpenAI Verfügbarkeit
    console.log('\n🔍 Prüfe Azure OpenAI Verfügbarkeit...');
    const isAzureAvailable = await rag.isAzureOpenAIAvailable();
    console.log('✅ Azure OpenAI verfügbar:', isAzureAvailable);

    // 3. API-Calls - SDK entscheidet automatisch zwischen Azure OpenAI und eigener API
    console.log('\n🚀 Führe API-Calls aus...');
    
    // Text Completion (Azure OpenAI oder eigene API)
    console.log('📝 Generiere Completion...');
    const completion = await rag.rag.generateCompletion({
      prompt: "Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation) in einfachen Worten",
      max_tokens: 300,
      temperature: 0.7
    });
    console.log('✅ Completion:', completion.result);
    if (completion.model) {
      console.log('   Modell:', completion.model);
    }

    // Embeddings (Azure OpenAI oder eigene API)
    console.log('\n🔢 Erstelle Embeddings...');
    const embedding = await rag.rag.createEmbeddings({
      input: "Dies ist ein Beispieltext für Embeddings",
      model: "text-embedding-ada-002"
    });
    console.log('✅ Embedding erstellt');
    if (embedding.model) {
      console.log('   Modell:', embedding.model);
    }
    if (embedding.vector) {
      console.log('   Vektor (erste 5 Werte):', embedding.vector.slice(0, 5));
    }

    // Text chunking (eigene API)
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

    // Text zusammenfassen (eigene API)
    console.log('\n📋 Fasse Text zusammen...');
    const summary = await rag.rag.summarizeText({
      text: longText,
      max_length: 100
    });
    console.log('✅ Summary:', summary.summary);

    // 4. Azure OpenAI Client direkt verwenden (falls verfügbar)
    if (isAzureAvailable) {
      console.log('\n🔧 Verwende Azure OpenAI Client direkt...');
      const azureClient = await rag.getAzureClient();
      if (azureClient) {
        console.log('✅ Azure OpenAI Client verfügbar');
        
        // Direkter Chat mit Azure OpenAI
        try {
          const chatResult = await azureClient.getChatCompletions(
            process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
            [
              { role: 'system', content: 'Du bist ein hilfreicher Assistent.' },
              { role: 'user', content: 'Was ist der Unterschied zwischen RAG und normalen LLMs?' }
            ],
            { maxTokens: 200, temperature: 0.7 }
          );
          
          console.log('✅ Direkter Azure OpenAI Chat:', chatResult.choices[0]?.message?.content);
        } catch (error) {
          console.warn('⚠️ Direkter Azure OpenAI Call fehlgeschlagen:', error);
        }
      }
    }

    // 5. Token-Status nach den Calls
    const finalStatus = rag.getTokenStatus();
    console.log('\n📊 Finaler Token-Status:', finalStatus);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel ohne Azure OpenAI (nur eigene API)
async function ownAPIExample() {
  console.log('\n🔧 RAG SDK mit eigener API (ohne Azure OpenAI)\n');
  
  const rag = new RAGSDK({
    username: process.env.RAG_USERNAME || 'your-username',
    password: process.env.RAG_PASSWORD || 'your-password',
    authUrl: 'https://login.microsoftonline.com/your-tenant-id',
    clientId: process.env.RAG_CLIENT_ID || 'your-client-id',
    baseURL: 'https://your-rag-endpoint.com'
  });

  try {
    await rag.authenticate();
    console.log('✅ Authentifizierung erfolgreich');
    
    const isAzureAvailable = await rag.isAzureOpenAIAvailable();
    console.log('✅ Azure OpenAI verfügbar:', isAzureAvailable);
    
    // Alle Calls gehen über eigene API
    const completion = await rag.rag.generateCompletion({
      prompt: 'Einfacher Test ohne Azure OpenAI',
      max_tokens: 100
    });
    console.log('✅ Completion über eigene API:', completion.result);
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Vereinheitlichtes RAG SDK - Alle Features in einem SDK!\n');
  
  // Beispiel 1: Mit Azure OpenAI Backend
  await unifiedRAGExample();
  
  // Beispiel 2: Nur eigene API
  await ownAPIExample();
  
  console.log('\n✨ Alle Beispiele abgeschlossen!');
  console.log('\n🎯 Das RAG SDK ist jetzt ein einheitlicher Proxy für:');
  console.log('   - OAuth2-Authentifizierung (Username/Passwort)');
  console.log('   - Azure OpenAI Backend (falls konfiguriert)');
  console.log('   - Eigene RAG-API (Fallback)');
  console.log('   - Automatische Token-Verwaltung');
}

// Beispiel ausführen
main().catch(console.error);
