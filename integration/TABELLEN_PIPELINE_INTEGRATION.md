# Spezialisierte Tabellen-Pipeline Integration

## 🎯 Übersicht

Du hast jetzt eine **komplette spezialisierte Pipeline** für Excel/Tabellen mit:

### 📦 Komponenten

1. **TableExtractionService** - Spezialisiert für Excel/Tabellen-Extraktion
2. **TableChunkingService** - Spezialisiert für Tabellen-Chunking (behält QA-Paare zusammen)
3. **TableFAQIngestionService** - Vollständige Pipeline für Tabellen
4. **Enhanced get_faq_ingestion_service** - Integration in bestehende Struktur

### 🔧 Services-Verwendung

- **TableExtractionService** (statt UTF8ExtractionService)
- **TableChunkingService** (statt normaler ChunkingService)
- **AzureOpenAIEmbeddingService** (bestehender)
- **PostgreSQLVectorService** (bestehender)
- **Kein SummaryService** (nicht benötigt für Tabellen)

## 🚀 Integration in deine bestehende Struktur

### 1. Dateien kopieren

```bash
# Kopiere die spezialisierten Services in dein Projekt
cp integration/table_extraction_service.py faq/services/
cp integration/table_chunking_service.py faq/services/
cp integration/table_faq_ingestion_service.py faq/services/
cp integration/enhanced_faq_ingestion_service.py faq/services/
```

### 2. get_faq_ingestion_service erweitern

```python
# In deiner bestehenden get_faq_ingestion_service Funktion
def get_faq_ingestion_service(service_type: str = "default", **kwargs):
    if service_type == "table":
        # SPEZIALISIERTE TABELLEN-PIPELINE
        embedding_service = get_embedding_service()  # AzureOpenAIEmbeddingService
        vector_service = get_vector_service()        # PostgreSQLVectorService
        
        return create_table_faq_ingestion_service(
            embedding_service=embedding_service,
            vector_service=vector_service,
            max_chunk_size=kwargs.get('max_chunk_size', 1000),
            overlap=kwargs.get('overlap', 100)
        )
    
    elif service_type == "default":
        # DEIN BESTEHENDER SERVICE
        return get_default_faq_ingestion_service(**kwargs)
    
    else:
        raise ValueError(f"Unbekannter Service-Type: {service_type}")
```

### 3. API-Endpoint erweitern

```python
# In deinem upload_document Endpoint
@router.post("/upload")
async def upload_document(
    file: UploadFile,
    document_source: str,
    service_type: str = "default"  # NEU: "table" für Tabellen
):
    # Service basierend auf Dateityp und service_type wählen
    if file.filename.lower().endswith(('.xlsx', '.xls', '.xlsm', '.xlsb', '.csv')):
        service_type = "table"  # Automatisch Tabellen-Pipeline für Excel
    
    # Service erstellen
    service = get_faq_ingestion_service(
        service_type=service_type,
        embedding_service=get_embedding_service(),
        vector_service=get_vector_service()
    )
    
    # Dokument verarbeiten
    result = await service.async_ingest(
        filename=file.filename,
        raw_content=await file.read(),
        documentId=generate_document_id(),
        documentSource=document_source
    )
    
    return result
```

## 🎯 Vorteile der spezialisierten Pipeline

### ✅ Für Tabellen optimiert
- **Multi-Sheet-Unterstützung**: Erkennt automatisch Test_Chatbot, FAQ_DEUTSCH, FAQ_English
- **QA-Paar-Erhaltung**: Behält Frage-Antwort-Paare als Einheiten zusammen
- **Strukturierte Chunks**: Jeder Chunk enthält vollständige QA-Paare
- **Fehlerbehandlung**: Detaillierte Validierung und Fehlermeldungen

### ✅ Bestehende Services wiederverwendet
- **AzureOpenAIEmbeddingService**: Für Embedding-Generierung
- **PostgreSQLVectorService**: Für Vector-Storage
- **Keine Duplikation**: Nutzt deine bestehende Infrastruktur

### ✅ Nahtlose Integration
- **Proxy-Pattern**: Entscheidet automatisch zwischen Tabellen und Standard-Pipeline
- **Backward Compatibility**: Bestehende Funktionalität bleibt unverändert
- **Flexible Konfiguration**: Chunk-Größe, Overlap, etc. konfigurierbar

## 📋 Verwendung

### Automatische Erkennung
```python
# Excel-Datei wird automatisch als "table" erkannt
service = get_faq_ingestion_service(service_type="table")
```

### Manuelle Auswahl
```python
# Explizit Tabellen-Pipeline verwenden
service = get_faq_ingestion_service(
    service_type="table",
    max_chunk_size=1500,
    overlap=200
)
```

### Standard-Pipeline
```python
# Bestehende Pipeline für andere Dateitypen
service = get_faq_ingestion_service(service_type="default")
```

## 🔍 Multi-Sheet-Unterstützung

Die Pipeline erkennt automatisch:

1. **Test_Chatbot** (Priorität 1) - Dein Blatt mit Nr., Frage, Antwort
2. **FAQ_DEUTSCH** (Priorität 2)
3. **FAQ_English** (Priorität 3)

Falls kein erwartetes Blatt gefunden wird, durchsucht sie alle anderen Blätter nach der richtigen Struktur.

## 📊 Ergebnis

Nach der Verarbeitung erhältst du:

- **Strukturierte QA-Paare** aus dem erkannten Tabellenblatt
- **Optimierte Chunks** mit vollständigen QA-Paaren
- **Detaillierte Metadaten** mit Tabellen-spezifischen Informationen
- **Fehlerbehandlung** für ungültige Strukturen
- **Vector-Storage** mit semantischer Suche

Die spezialisierte Pipeline ist jetzt bereit für die Integration in dein bestehendes System! 🚀
