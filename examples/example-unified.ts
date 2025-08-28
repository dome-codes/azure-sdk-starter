import { ModelType, Quality, RAGSDK, ResponseFormat, Role, Size, Style } from '../dist';

// Vollständiges RAG SDK Beispiel mit allen Features
async function completeRAGExample() {
  console.log('🚀 Vollständiges RAG SDK Beispiel mit allen Features\n');
  
  // RAG SDK - nur das Wesentliche
  const rag = new RAGSDK({
    username: process.env.RAG_USERNAME || 'testuser',
    password: process.env.RAG_PASSWORD || 'your-password',
    baseURL: 'http://localhost:3000', // RAG API Endpoint
    
    // OAuth2 Konfiguration (Keycloak läuft auf localhost:8080)
    authUrl: process.env.AUTH_URL || 'http://localhost:8080/auth/realms/rag-api-realm/protocol/openid-connect/token',
    clientId: process.env.CLIENT_ID || 'rag-sdk-client',
    scope: process.env.SCOPE || 'openid profile email',
    
    // Optionale Azure-Parameter (werden an Backend weitergegeben)
    deploymentName: process.env.AZURE_DEPLOYMENT || 'gpt-4',
    apiVersion: process.env.AZURE_API_VERSION || '2024-02-15-preview',
    
    // Erweiterte Konfiguration
    timeout: 30000,
    maxRetries: 3,
    logLevel: 'info'
  });

  try {
    // 1. Authentifizierung (holt Bearer-Token)
    console.log('🔐 Authentifiziere...');
    const token = await rag.rag.authenticate();
    console.log('✅ Authentifizierung erfolgreich!');
    
    // Token-Status anzeigen
    const status = rag.rag.getTokenStatus();
    console.log('📊 Token-Status:', status);

    // 2. API-Calls - alle gehen über dein Backend, das Azure OpenAI verwendet
    console.log('\n🚀 Führe API-Calls aus...');
    
    // Text Completion (wird über dein Backend an Azure OpenAI weitergeleitet)
    console.log('📝 Generiere Completion...');
    const completion = await rag.rag.generateCompletion({
      messages: [
        { 
          role: Role.SYSTEM, 
          content: 'Du bist ein hilfreicher Assistent, der komplexe Themen einfach erklärt.' 
        },
        { 
          role: Role.USER, 
          content: 'Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation) in einfachen Worten' 
        }
      ],
      model: ModelType.GPT_4,
      max_tokens: 300,
      temperature: 0.7,
      response_format: ResponseFormat.TEXT
    });
    console.log('✅ Completion:', completion.choices[0].message.content);

    // Embeddings (wird über dein Backend an Azure OpenAI weitergeleitet)
    console.log('\n🔢 Erstelle Embeddings...');
    const embedding = await rag.rag.createEmbeddings({
      input: "Dies ist ein Beispieltext für Embeddings",
      model: ModelType.TEXT_EMBEDDING_ADA_002
    });
    console.log('✅ Embedding erstellt');

    // Text chunking (geplant, noch nicht implementiert)
    console.log('\n✂️ Chunking Text...');
    const longText = `
      Dies ist ein sehr langer Text, der in kleinere Stücke aufgeteilt werden soll. 
      RAG (Retrieval-Augmented Generation) ist eine Technik, die es ermöglicht, 
      Large Language Models mit externen Wissensquellen zu erweitern.
    `;
    
    console.log('ℹ️ Text Chunking ist geplant, aber noch nicht implementiert');
    console.log('📝 Text Länge:', longText.length, 'Zeichen');

    // Text zusammenfassen (geplant, noch nicht implementiert)
    console.log('\n📋 Fasse Text zusammen...');
    console.log('ℹ️ Text Summarization ist geplant, aber noch nicht implementiert');
    console.log('📝 Text Länge:', longText.length, 'Zeichen');

    // Image Generation (wird über dein Backend an Azure OpenAI weitergeleitet)
    console.log('\n🎨 Generiere Image...');
    const image = await rag.rag.generateImage({
      prompt: "Ein modernes, minimalistisches Logo für eine KI-Firma mit blauen und weißen Farben",
      model: ModelType.GPT_4,
      quality: Quality.HD,
      style: Style.NATURAL,
      size: Size.SIZE_1024,
      response_format: ResponseFormat.URL,
      n: 1
    });
    console.log('✅ Image generiert:', image.data?.[0]?.url);

    // 3. Token-Status nach den Calls
    const finalStatus = rag.rag.getTokenStatus();
    console.log('\n📊 Finaler Token-Status:', finalStatus);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel für verschiedene Konfigurationen
async function configurationExamples() {
  console.log('\n🔧 Konfigurationsbeispiele\n');
  
  // Beispiel 1: Minimale Konfiguration
  console.log('📋 Minimale Konfiguration:');
  const minimalRAG = new RAGSDK({
    username: 'user',
    password: 'pass',
    baseURL: 'https://api.example.com'
  });
  console.log('✅ Minimal RAG SDK erstellt');

  // Beispiel 2: Vollständige Konfiguration
  console.log('\n📋 Vollständige Konfiguration:');
  const fullRAG = new RAGSDK({
    username: 'user',
    password: 'pass',
    baseURL: 'https://api.example.com',
    deploymentName: 'gpt-4-turbo',
    apiVersion: '2024-02-15-preview',
    timeout: 60000,
    maxRetries: 5,
    retryDelay: 1000,
    logLevel: 'debug',
    enableLogging: true,
    headers: {
      'X-Custom-Header': 'custom-value',
      'X-Client-Version': '1.0.0'
    }
  });
  console.log('✅ Vollständiges RAG SDK erstellt');

  // Beispiel 3: Mit Azure-spezifischen Headers
  console.log('\n📋 Azure-spezifische Konfiguration:');
  const azureRAG = new RAGSDK({
    username: 'user',
    password: 'pass',
    baseURL: 'https://api.example.com',
    deploymentName: 'gpt-4-deployment',
    apiVersion: '2024-02-15-preview'
  });
  console.log('✅ Azure RAG SDK erstellt (deploymentName und apiVersion werden als Headers weitergegeben)');

  // Beispiel 4: Keycloak OAuth2 Konfiguration
  console.log('\n📋 Keycloak OAuth2 Konfiguration:');
  const keycloakRAG = new RAGSDK({
    username: 'testuser',
    password: 'pass',
    baseURL: 'http://localhost:3000', // RAG API Endpoint
    authUrl: 'http://localhost:8080/auth/realms/rag-api-realm/protocol/openid-connect/token', // Keycloak Server
    clientId: 'rag-sdk-client',
    scope: 'openid profile email'
  });
  console.log('✅ Keycloak RAG SDK erstellt (RAG API auf 3000, Keycloak auf 8080)');
}

// Beispiel für Error Handling
async function errorHandlingExample() {
  console.log('\n⚠️ Error Handling Beispiel\n');
  
  const rag = new RAGSDK({
    username: 'invalid-user',
    password: 'invalid-pass',
    baseURL: 'https://invalid-url.com',
    timeout: 5000 // Kurzer Timeout für Demo
  });

  try {
    console.log('🔐 Versuche Authentifizierung mit ungültigen Credentials...');
    await rag.rag.authenticate();
  } catch (error) {
    console.log('✅ Fehler wurde korrekt abgefangen:', error.message);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Vollständiges RAG SDK - Alle Features im Überblick!\n');
  
  // Hauptbeispiel mit allen Features
  await completeRAGExample();
  
  // Konfigurationsbeispiele
  await configurationExamples();
  
  // Error Handling Beispiel
  await errorHandlingExample();
  
  console.log('\n✨ Alle Beispiele abgeschlossen!');
  console.log('\n🎯 Das RAG SDK bietet jetzt:');
  console.log('   ✅ Text Completion mit Chat-Format');
  console.log('   ✅ Embeddings mit verschiedenen Modellen');
  console.log('   ✅ Image Generation mit allen Optionen');
  console.log('   📋 Text Chunking (geplant)');
  console.log('   📋 Text Summarization (geplant)');
  console.log('   ✅ Erweiterte Konfiguration (timeout, retries, logging)');
  console.log('   ✅ Type-Safe Enums für alle Parameter');
  console.log('   ✅ Automatische Authentifizierung und Token-Verwaltung');
  console.log('   ✅ Azure OpenAI Integration über dein Backend');
  console.log('   ✅ Einfache Verwendung: nur Username + Password + BaseURL');
}

// Beispiel ausführen
main().catch(console.error);
