import { RAGSDK } from './dist';

// Vereinfachtes RAG SDK Beispiel
async function simpleRAGExample() {
  console.log('🚀 Vereinfachtes RAG SDK Beispiel\n');
  
  // RAG SDK - direkt über Azure OpenAI
  const rag = new RAGSDK({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com/',
    apiKey: process.env.AZURE_OPENAI_API_KEY || 'your-azure-api-key'
    // deploymentName, embeddingDeploymentName und apiVersion werden im Backend gesetzt
  });

  try {
    // 1. API-Calls - direkt über Azure OpenAI
    console.log('🚀 Führe API-Calls aus...');
    
    // Text Completion (direkt über Azure OpenAI)
    console.log('📝 Generiere Completion...');
    const completion = await rag.rag.generateCompletion({
      prompt: "Erkläre mir das Konzept von RAG (Retrieval-Augmented Generation) in einfachen Worten",
      max_tokens: 300,
      temperature: 0.7
    }) as any;
    console.log('✅ Completion:', completion.choices[0]?.message?.content);

    // Embeddings (direkt über Azure OpenAI)
    console.log('\n🔢 Erstelle Embeddings...');
    const embedding = await rag.rag.createEmbeddings({
      input: "Dies ist ein Beispieltext für Azure OpenAI Embeddings",
      model: "text-embedding-ada-002"
    }) as any;
    console.log('✅ Embedding erstellt mit', embedding.data.length, 'Vektoren');
    console.log('✅ Erster Vektor (erste 5 Werte):', embedding.data[0]?.embedding?.slice(0, 5));

    // 2. Direkter Zugriff auf Azure OpenAI Client
    console.log('\n🔧 Verwende Azure OpenAI Client direkt...');
    const azureClient = rag.rag.getAzureClient();
    
    // Chat Completion mit System-Message
    const chatCompletion = await azureClient.generateChatCompletion({
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher Assistent, der RAG erklärt.'
        },
        {
          role: 'user',
          content: 'Was ist der Unterschied zwischen RAG und normalen LLMs?'
        }
      ],
      maxTokens: 200,
      temperature: 0.7
    });
    console.log('✅ Chat Completion:', chatCompletion.choices[0]?.message?.content);

    // 3. Deployment wechseln
    console.log('\n🔄 Wechsle Deployment...');
    azureClient.setDeployment('gpt-35-turbo');
    console.log('✅ Deployment gewechselt zu gpt-35-turbo');

    // 4. Neuer Chat mit anderem Deployment
    console.log('\n💬 Chat mit neuem Deployment...');
    const newChatCompletion = await azureClient.generateChatCompletion({
      messages: [
        {
          role: 'user',
          content: 'Erkläre RAG in einem Satz'
        }
      ],
      maxTokens: 100
    });
    console.log('✅ Neue Chat Response:', newChatCompletion.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel mit Managed Identity (für Azure-Umgebungen)
async function managedIdentityExample() {
  console.log('\n🔐 Azure OpenAI mit Managed Identity Beispiel\n');

  const rag = new RAGSDK({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com/',
    useManagedIdentity: true,
    deploymentName: 'gpt-4'
  });

  try {
    console.log('🔐 Verwende Managed Identity...');
    
    const completion = await rag.rag.generateCompletion({
      prompt: 'Erkläre RAG mit Managed Identity',
      max_tokens: 150
    }) as any;
    console.log('✅ Completion:', completion.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Vereinfachtes RAG SDK - Direkt über Azure OpenAI!\n');
  
  await simpleRAGExample();
  await managedIdentityExample();
  
  console.log('\n✨ Beispiel abgeschlossen!');
  console.log('\n🎯 Das RAG SDK ist jetzt super einfach:');
  console.log('   - Endpoint + API-Key + Deployment');
  console.log('   - Direkte Kommunikation mit Azure OpenAI');
  console.log('   - Keine HTTP-Proxy-Layer');
  console.log('   - Vollständige Azure OpenAI Kompatibilität');
  console.log('   - Optionale RAG-Features über dein Backend');
}

// Beispiel ausführen
main().catch(console.error);
