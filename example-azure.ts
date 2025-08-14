import { AzureOpenAISDK, ChatCompletionRequest, CompletionRequest, EmbeddingRequest } from './dist';

// Azure OpenAI SDK Beispiel
async function azureOpenAIExample() {
  console.log('🚀 Azure OpenAI SDK Beispiel\n');

  // SDK mit Azure Key initialisieren
  const azureOpenAI = new AzureOpenAISDK({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com/',
    apiKey: process.env.AZURE_OPENAI_API_KEY || 'your-azure-api-key',
    deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
    embeddingDeploymentName: process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-ada-002'
  });

  try {
    // 1. Chat Completion mit System- und User-Message
    console.log('💬 Chat Completion mit System-Message...');
    const chatRequest: ChatCompletionRequest = {
      messages: [
        {
          role: 'system',
          content: 'Du bist ein hilfreicher Assistent, der RAG (Retrieval-Augmented Generation) erklärt.'
        },
        {
          role: 'user',
          content: 'Erkläre mir RAG in einfachen Worten'
        }
      ],
      maxTokens: 300,
      temperature: 0.7
    };

    const chatResult = await azureOpenAI.chatCompletion(chatRequest);
    console.log('✅ Chat Response:', chatResult.choices[0]?.message?.content);

    // 2. Einfache Text Completion
    console.log('\n📝 Einfache Text Completion...');
    const completionRequest: CompletionRequest = {
      prompt: 'RAG ist eine Technik, die...',
      maxTokens: 150,
      temperature: 0.5
    };

    const completionResult = await azureOpenAI.completion(completionRequest);
    console.log('✅ Completion Response:', completionResult.choices[0]?.message?.content);

    // 3. Embeddings erstellen
    console.log('\n🔢 Erstelle Embeddings...');
    const embeddingRequest: EmbeddingRequest = {
      input: 'Dies ist ein Beispieltext für Azure OpenAI Embeddings',
      model: 'text-embedding-ada-002'
    };

    const embeddingResult = await azureOpenAI.embeddings(embeddingRequest);
    console.log('✅ Embedding erstellt mit', embeddingResult.data.length, 'Vektoren');
    console.log('✅ Erster Vektor (erste 5 Werte):', embeddingResult.data[0]?.embedding?.slice(0, 5));

    // 4. Deployment wechseln
    console.log('\n🔄 Wechsle Deployment...');
    azureOpenAI.setDeployment('gpt-35-turbo');
    console.log('✅ Deployment gewechselt zu gpt-35-turbo');

    // 5. Neuer Chat mit anderem Deployment
    console.log('\n💬 Chat mit neuem Deployment...');
    const newChatRequest: ChatCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Was ist der Unterschied zwischen GPT-4 und GPT-3.5?'
        }
      ],
      maxTokens: 200
    };

    const newChatResult = await azureOpenAI.chatCompletion(newChatRequest);
    console.log('✅ Neue Chat Response:', newChatResult.choices[0]?.message?.content);

    // 6. Konfiguration anzeigen
    console.log('\n⚙️ Aktuelle Konfiguration:');
    const config = azureOpenAI.openai.getConfig();
    console.log('   Endpoint:', config.endpoint);
    console.log('   Deployment:', config.deploymentName);
    console.log('   Embedding Deployment:', config.embeddingDeploymentName);

  } catch (error) {
    console.error('❌ Fehler:', error);
  }
}

// Beispiel mit Managed Identity (für Azure-Umgebungen)
async function azureManagedIdentityExample() {
  console.log('\n🔐 Azure OpenAI mit Managed Identity Beispiel\n');

  const azureOpenAI = new AzureOpenAISDK({
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://your-resource.openai.azure.com/',
    useManagedIdentity: true,
    deploymentName: 'gpt-4'
  });

  try {
    console.log('🔐 Verwende Managed Identity für Authentifizierung...');
    
    const chatRequest: ChatCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Hallo! Wie funktioniert Azure OpenAI?'
        }
      ],
      maxTokens: 100
    };

    const result = await azureOpenAI.chatCompletion(chatRequest);
    console.log('✅ Managed Identity Response:', result.choices[0]?.message?.content);

  } catch (error) {
    console.error('❌ Fehler mit Managed Identity:', error);
  }
}

// Hauptfunktion
async function main() {
  console.log('🚀 Azure OpenAI SDK Beispiele\n');
  
  // Beispiel 1: Azure Key Authentifizierung
  await azureOpenAIExample();
  
  // Beispiel 2: Managed Identity (nur in Azure-Umgebungen)
  if (process.env.AZURE_OPENAI_ENDPOINT) {
    await azureManagedIdentityExample();
  }
  
  console.log('\n✨ Alle Azure OpenAI Beispiele abgeschlossen!');
}

// Beispiel ausführen
main().catch(console.error);
