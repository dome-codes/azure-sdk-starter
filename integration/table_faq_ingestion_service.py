#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TableFAQIngestionService - Spezialisierte Pipeline für Excel/Tabellen
"""

import logging
import hashlib
from datetime import datetime
from typing import Dict, Any, Optional
from dataclasses import dataclass

# Import der spezialisierten Services
from .table_extraction_service import TableExtractionService, TableExtractionResult
from .table_chunking_service import TableChunkingService, TableChunkingResult, TableChunk

logger = logging.getLogger(__name__)

@dataclass
class TableDocumentMetadata:
    """Metadaten für Tabellen-Dokumente"""
    document_id: str
    document_source: str
    document_class: Optional[str] = None
    document_mime_type: Optional[str] = None
    document_internal: Optional[str] = None
    description: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    created_at: Optional[datetime] = None
    
    # Tabellen-spezifische Metadaten
    sheet_name: Optional[str] = None
    total_rows: Optional[int] = None
    total_columns: Optional[int] = None
    qa_pairs_count: Optional[int] = None
    chunks_count: Optional[int] = None
    
    # Fehlerbehandlung
    processing_errors: Optional[list] = None
    processing_warnings: Optional[list] = None

class TableFAQIngestionService:
    """
    Spezialisierte Pipeline für Excel/Tabellen-Ingestion
    Verwendet spezialisierte Services für Extraction, Chunking, Embedding und Vector Storage
    """
    
    def __init__(self, 
                 embedding_service,  # AzureOpenAIEmbeddingService
                 vector_service,     # PostgreSQLVectorService
                 chunking_service: Optional[TableChunkingService] = None):
        """
        Initialisiert die Tabellen-Pipeline
        
        Args:
            embedding_service: AzureOpenAIEmbeddingService
            vector_service: PostgreSQLVectorService  
            chunking_service: TableChunkingService (optional, wird erstellt wenn nicht vorhanden)
        """
        # Spezialisierte Services
        self.extraction_service = TableExtractionService()
        self.chunking_service = chunking_service or TableChunkingService()
        
        # Bestehende Services (von dir bereitgestellt)
        self.embedding_service = embedding_service
        self.vector_service = vector_service
        
        logger.info("✅ TableFAQIngestionService initialisiert")
    
    def _generate_document_hash(self, content: bytes) -> str:
        """Generiert Hash für Dokument"""
        return hashlib.sha256(content).hexdigest()
    
    def _create_document_metadata(self, 
                                document_id: str,
                                document_source: str,
                                extraction_result: TableExtractionResult,
                                chunking_result: TableChunkingResult,
                                **kwargs) -> TableDocumentMetadata:
        """Erstellt Metadaten für Tabellen-Dokument"""
        return TableDocumentMetadata(
            document_id=document_id,
            document_source=document_source,
            document_class=kwargs.get('document_class'),
            document_mime_type=kwargs.get('document_mime_type'),
            document_internal=kwargs.get('document_internal'),
            description=kwargs.get('description'),
            filename=kwargs.get('filename'),
            file_size=kwargs.get('file_size'),
            created_at=datetime.now(),
            
            # Tabellen-spezifische Metadaten
            sheet_name=extraction_result.sheet_name,
            total_rows=extraction_result.total_rows,
            total_columns=extraction_result.total_columns,
            qa_pairs_count=extraction_result.qa_pairs,
            chunks_count=chunking_result.total_chunks,
            
            # Fehlerbehandlung
            processing_errors=extraction_result.processing_errors,
            processing_warnings=extraction_result.processing_warnings
        )
    
    async def async_ingest(self, 
                          filename: str,
                          raw_content: bytes,
                          documentId: str,
                          documentSource: str,
                          documentClass: Optional[str] = None,
                          documentMimeType: Optional[str] = None,
                          documentInternal: Optional[str] = None,
                          desc: Optional[str] = None,
                          **kwargs) -> TableDocumentMetadata:
        """
        Vollständige Tabellen-Ingestion Pipeline
        
        Args:
            filename: Dateiname
            raw_content: Roher Dateiinhalt
            documentId: Dokument-ID
            documentSource: Dokument-Quelle
            documentClass: Dokument-Klasse
            documentMimeType: MIME-Type
            documentInternal: Internes Dokument
            desc: Beschreibung
            **kwargs: Zusätzliche Parameter
            
        Returns:
            TableDocumentMetadata: Verarbeitete Metadaten
        """
        try:
            logger.info(f"🚀 Starte Tabellen-Ingestion für: {filename}")
            
            # 1. EXTRACTION: Excel-Inhalt extrahieren
            logger.info("📖 Schritt 1: Extraktion")
            extraction_result = await self.extraction_service.extract(
                filename=filename,
                raw_content=raw_content
            )
            
            # Prüfe auf Extraktionsfehler
            if extraction_result.processing_errors:
                logger.error(f"❌ Extraktionsfehler: {extraction_result.processing_errors}")
                # Erstelle Metadaten mit Fehlern
                metadata = self._create_document_metadata(
                    document_id=documentId,
                    document_source=documentSource,
                    extraction_result=extraction_result,
                    chunking_result=TableChunkingResult(chunks=[], total_chunks=0, metadata={}),
                    document_class=documentClass,
                    document_mime_type=documentMimeType,
                    document_internal=documentInternal,
                    description=desc,
                    filename=filename,
                    file_size=len(raw_content)
                )
                return metadata
            
            # 2. CHUNKING: Inhalt in Chunks aufteilen
            logger.info("🔪 Schritt 2: Chunking")
            chunking_result = await self.chunking_service.chunk(
                content=extraction_result.content,
                metadata=extraction_result.metadata,
                qa_pairs=extraction_result.qa_pairs
            )
            
            # 3. EMBEDDING: Embeddings für jeden Chunk generieren
            logger.info("🧠 Schritt 3: Embedding-Generierung")
            for chunk in chunking_result.chunks:
                try:
                    # Embedding für Chunk-Inhalt generieren
                    embedding = await self.embedding_service.get_text_embedding(chunk.content)
                    
                    # Embedding zu Chunk-Metadaten hinzufügen
                    chunk.metadata['embedding'] = embedding
                    chunk.metadata['embedding_model'] = self.embedding_service.model_name
                    
                except Exception as e:
                    logger.error(f"❌ Fehler beim Embedding für Chunk {chunk.chunk_id}: {str(e)}")
                    chunk.metadata['embedding_error'] = str(e)
            
            # 4. VECTOR STORAGE: Chunks in Vector-Datenbank speichern
            logger.info("💾 Schritt 4: Vector Storage")
            stored_chunks = []
            for chunk in chunking_result.chunks:
                try:
                    # Chunk in Vector-Datenbank speichern
                    stored_chunk = await self.vector_service.store_chunk(
                        chunk_id=chunk.chunk_id,
                        content=chunk.content,
                        embedding=chunk.metadata.get('embedding'),
                        metadata=chunk.metadata
                    )
                    stored_chunks.append(stored_chunk)
                    
                except Exception as e:
                    logger.error(f"❌ Fehler beim Speichern von Chunk {chunk.chunk_id}: {str(e)}")
                    chunk.metadata['storage_error'] = str(e)
            
            # 5. METADATA: Dokument-Metadaten erstellen
            logger.info("📋 Schritt 5: Metadaten-Erstellung")
            metadata = self._create_document_metadata(
                document_id=documentId,
                document_source=documentSource,
                extraction_result=extraction_result,
                chunking_result=chunking_result,
                document_class=documentClass,
                document_mime_type=documentMimeType,
                document_internal=documentInternal,
                description=desc,
                filename=filename,
                file_size=len(raw_content)
            )
            
            # Erweiterte Metadaten für Vector Storage
            metadata.vector_storage_info = {
                'stored_chunks': len(stored_chunks),
                'total_chunks': len(chunking_result.chunks),
                'embedding_model': self.embedding_service.model_name,
                'vector_service': type(self.vector_service).__name__
            }
            
            logger.info(f"✅ Tabellen-Ingestion erfolgreich abgeschlossen:")
            logger.info(f"   📊 QA-Paare: {extraction_result.qa_pairs}")
            logger.info(f"   🔪 Chunks: {chunking_result.total_chunks}")
            logger.info(f"   💾 Gespeicherte Vektoren: {len(stored_chunks)}")
            logger.info(f"   📋 Tabellenblatt: {extraction_result.sheet_name}")
            
            return metadata
            
        except Exception as e:
            logger.error(f"❌ Fehler in Tabellen-Ingestion Pipeline: {str(e)}")
            raise

# Factory-Funktion für Tabellen-Pipeline
def create_table_faq_ingestion_service(embedding_service, vector_service, **kwargs) -> TableFAQIngestionService:
    """
    Erstellt spezialisierte Tabellen-Pipeline
    
    Args:
        embedding_service: AzureOpenAIEmbeddingService
        vector_service: PostgreSQLVectorService
        **kwargs: Zusätzliche Parameter für ChunkingService
        
    Returns:
        TableFAQIngestionService: Konfigurierte Pipeline
    """
    chunking_service = TableChunkingService(**kwargs)
    return TableFAQIngestionService(
        embedding_service=embedding_service,
        vector_service=vector_service,
        chunking_service=chunking_service
    )
