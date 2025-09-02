#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG Ingestion Adapter mit Proxy Pattern
Integriert das Two-Database RAG System mit bestehenden API-Endpunkten
Verwendet bestehende Embedding/LLM-Services
"""

import os
import logging
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Union
from dataclasses import dataclass
from datetime import datetime
import pandas as pd
import numpy as np

# PostgreSQL
import psycopg2
from psycopg2.extras import RealDictCursor

# Environment
from dotenv import load_dotenv

# Lade Umgebungsvariablen
load_dotenv()

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ExtendedDocumentMetadata:
    """Erweiterte Dokument-Metadaten für API-Integration"""
    document_id: str
    document_source: str
    document_class: Optional[str] = None
    document_mime_type: Optional[str] = None
    document_internal: Optional[str] = None
    description: Optional[str] = None
    filename: Optional[str] = None
    file_size: Optional[int] = None
    created_at: Optional[datetime] = None
    total_rows: Optional[int] = None
    total_columns: Optional[int] = None
    qa_pairs: Optional[List[Dict[str, Any]]] = None
    
    # RAG-spezifische Metadaten
    rag_metadata: Optional[Dict[str, Any]] = None
    
    # Fehlerbehandlung
    processing_errors: Optional[List[Dict[str, Any]]] = None
    processing_warnings: Optional[List[Dict[str, Any]]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Konvertiert zu Dictionary für JSON-Serialisierung"""
        data = {
            'document_id': self.document_id,
            'document_source': self.document_source,
            'document_class': self.document_class,
            'document_mime_type': self.document_mime_type,
            'document_internal': self.document_internal,
            'description': self.description,
            'filename': self.filename,
            'file_size': self.file_size,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_rows': self.total_rows,
            'total_columns': self.total_columns,
            'qa_pairs': self.qa_pairs,
            'rag_metadata': self.rag_metadata,
            'processing_errors': self.processing_errors,
            'processing_warnings': self.processing_warnings
        }
        # Entferne None-Werte
        return {k: v for k, v in data.items() if v is not None}

class RAGProcessingError(Exception):
    """Spezielle Exception für RAG-Verarbeitungsfehler"""
    def __init__(self, message: str, error_type: str, details: Dict[str, Any] = None):
        self.message = message
        self.error_type = error_type
        self.details = details or {}
        super().__init__(self.message)

class RAGProcessingWarning:
    """Warnung bei RAG-Verarbeitung"""
    def __init__(self, message: str, warning_type: str, details: Dict[str, Any] = None):
        self.message = message
        self.warning_type = warning_type
        self.details = details or {}
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'message': self.message,
            'warning_type': self.warning_type,
            'details': self.details,
            'timestamp': self.timestamp
        }

class MetadataTemplateFactory:
    """Factory für Standard-Metadaten-Templates - Angepasst für bestehende Struktur"""
    
    @staticmethod
    def create_document_metadata(
        document_id: str,
        document_source: str,
        document_class: Optional[str] = None,
        document_mime_type: Optional[str] = None,
        total_rows: Optional[int] = None,
        total_columns: Optional[int] = None,
        file_path: Optional[str] = None,
        file_size: Optional[int] = None,
        created_at: Optional[datetime] = None,
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Erstellt Dokument-Metadaten für bestehende Struktur"""
        metadata = {
            "metadata_type": "document",
            "created_at": (created_at or datetime.now()).isoformat(),
            "created_by": "rag_ingestion_adapter",
            "version": "1.0",
            "id": document_id,
            "source_id": document_id,
            "title": f"Document {document_id}",
            "description": f"Document from {document_source}",
            "content_type": "excel" if document_mime_type and "spreadsheet" in document_mime_type else "document",
            "mime_type": document_mime_type,
            "source_file": file_path,
            "source_type": "file_upload",
            "processing_timestamp": datetime.now().isoformat(),
            "processing_pipeline": "rag_excel_qa_extraction",
            "quality_score": 1.0,
            "tags": ["document", "excel", "qa_data", "rag_processed"],
            "categories": [document_class] if document_class else ["faq"],
            "custom_fields": {
                "document_source": document_source,
                "document_class": document_class,
                "document_internal": None,  # Wird später gesetzt
                "total_rows": total_rows,
                "total_columns": total_columns,
                "file_size": file_size,
                "rag_processed": True,
                "qa_extraction_successful": True
            }
        }
        
        # Zusätzliche Metadaten hinzufügen
        if additional_metadata:
            metadata["custom_fields"].update(additional_metadata)
        
        return metadata
    
    @staticmethod
    def create_qa_metadata(
        question: str,
        answer: str,
        document_id: str,
        document_source: str,
        row_id: Optional[str] = None,
        comment: Optional[str] = None,
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Erstellt QA-Metadaten für bestehende Struktur"""
        # Berechne Token-Anzahl (grobe Schätzung)
        num_tokens = len(question.split()) + len(answer.split())
        
        metadata = {
            "metadata_type": "qa_pair",
            "created_at": datetime.now().isoformat(),
            "created_by": "rag_ingestion_adapter",
            "version": "1.0",
            "id": f"{document_id}_{row_id}" if row_id else f"{document_id}_qa",
            "parent_id": document_id,
            "source_id": document_id,
            "title": f"QA Pair {row_id}" if row_id else "QA Pair",
            "description": f"Question: {question[:100]}...",
            "content_type": "qa_pair",
            "num_tokens": num_tokens,
            "num_chars": len(question) + len(answer),
            "num_words": len(question.split()) + len(answer.split()),
            "language": "de",  # Standard für deutsche FAQ
            "processing_timestamp": datetime.now().isoformat(),
            "processing_pipeline": "rag_qa_extraction",
            "quality_score": 1.0,
            "tags": ["qa_pair", "faq", "question_answer", "rag_processed"],
            "keywords": question.split()[:5],  # Erste 5 Wörter als Keywords
            "custom_fields": {
                "question": question,
                "answer": answer,
                "row_id": row_id,
                "comment": comment,
                "question_length": len(question),
                "answer_length": len(answer),
                "document_source": document_source,
                "rag_processed": True,
                "qa_extraction_method": "excel_row_extraction"
            }
        }
        
        # Zusätzliche Metadaten hinzufügen
        if additional_metadata:
            metadata["custom_fields"].update(additional_metadata)
        
        return metadata

class RAGIngestionAdapter:
    """
    Proxy Pattern Implementation für RAG Integration
    Verwendet bestehende Embedding/LLM-Services
    """
    
    def __init__(self, 
                 docs_connection_string: str = None,
                 vectors_connection_string: str = None,
                 embedding_service = None,  # ← Bestehender Embedding Service
                 llm_service = None):       # ← Bestehender LLM Service
        
        # Datenbank-Konfiguration
        self.docs_connection_string = docs_connection_string or \
            "postgresql://rag_user:rag_password@localhost:5432/rag_docs"
        self.vectors_connection_string = vectors_connection_string or \
            "postgresql://rag_user:rag_password@localhost:5432/rag_vectors"
        
        # Bestehende Services verwenden
        self.embedding_service = embedding_service
        self.llm_service = llm_service
        
        # Metadata Template Factory
        self.metadata_factory = MetadataTemplateFactory()
        
        # Original Service (wird lazy geladen)
        self._original_service = None
        
        # Erwartete Excel-Spalten
        self.expected_columns = ['Nr.', 'Frage', 'Antwort']
        self.optional_columns = ['Kommentar']
        
        logger.info("✅ RAG Ingestion Adapter (Proxy) erfolgreich initialisiert")
        
    @property
    def original_service(self):
        """Lazy Loading des Original Services"""
        if self._original_service is None:
            # Hier importierst du deinen bestehenden Service
            # from your_existing_module import get_original_faq_ingestion_service
            # self._original_service = get_original_faq_ingestion_service("DefaultFAQIngestionService")
            
            # Fallback für Demo
            self._original_service = self._create_fallback_service()
        
        return self._original_service
    
    def _create_fallback_service(self):
        """Erstellt einen Fallback Service für Demo-Zwecke"""
        class FallbackService:
            async def async_ingest(self, filename: str, raw_content: bytes, **kwargs):
                logger.info(f"📄 Fallback Service: Verarbeite {filename}")
                return ExtendedDocumentMetadata(
                    document_id=kwargs.get('documentId', 'fallback'),
                    document_source=kwargs.get('documentSource', 'fallback'),
                    filename=filename,
                    file_size=len(raw_content),
                    created_at=datetime.now()
                )
        
        return FallbackService()
    
    def _validate_excel_structure(self, df: pd.DataFrame, filename: str) -> tuple[List[str], List[RAGProcessingWarning]]:
        """
        Validiert die Excel-Struktur und gibt Fehler/Warnungen zurück
        
        Args:
            df: DataFrame der Excel-Datei
            filename: Name der Datei
            
        Returns:
            tuple: (missing_columns, warnings)
        """
        warnings = []
        missing_columns = []
        
        # Überprüfe erwartete Spalten
        for expected_col in self.expected_columns:
            if expected_col not in df.columns:
                missing_columns.append(expected_col)
        
        # Überprüfe optionale Spalten
        for optional_col in self.optional_columns:
            if optional_col not in df.columns:
                warnings.append(RAGProcessingWarning(
                    message=f"Optionale Spalte '{optional_col}' fehlt in der Excel-Datei",
                    warning_type="missing_optional_column",
                    details={
                        'column_name': optional_col,
                        'filename': filename,
                        'available_columns': list(df.columns),
                        'expected_columns': self.expected_columns,
                        'optional_columns': self.optional_columns
                    }
                ))
        
        # Überprüfe unbekannte Spalten
        all_known_columns = self.expected_columns + self.optional_columns
        unknown_columns = [col for col in df.columns if col not in all_known_columns]
        
        if unknown_columns:
            warnings.append(RAGProcessingWarning(
                message=f"Unbekannte Spalten gefunden: {', '.join(unknown_columns)}",
                warning_type="unknown_columns",
                details={
                    'unknown_columns': unknown_columns,
                    'filename': filename,
                    'available_columns': list(df.columns),
                    'expected_columns': self.expected_columns,
                    'optional_columns': self.optional_columns,
                    'supported_format': "Excel-Datei mit Spalten: Nr., Frage, Antwort (Kommentar optional)"
                }
            ))
        
        # Überprüfe leere Spalten
        empty_columns = []
        for col in df.columns:
            if df[col].isna().all() or (df[col].astype(str).str.strip() == '').all():
                empty_columns.append(col)
        
        if empty_columns:
            warnings.append(RAGProcessingWarning(
                message=f"Leere Spalten gefunden: {', '.join(empty_columns)}",
                warning_type="empty_columns",
                details={
                    'empty_columns': empty_columns,
                    'filename': filename
                }
            ))
        
        return missing_columns, warnings
    
    async def async_ingest(self, 
                          filename: str,
                          raw_content: bytes,
                          documentId: str,
                          documentSource: str,
                          documentClass: Optional[str] = None,
                          documentMimeType: Optional[str] = None,
                          documentInternal: Optional[str] = None,
                          desc: Optional[str] = None,
                          **kwargs) -> ExtendedDocumentMetadata:
        """
        Proxy-Methode: Entscheidet basierend auf Dateityp zwischen RAG und Original Service
        
        Args:
            filename: Name der Datei
            raw_content: Rohdaten der Datei
            documentId: Eindeutige Dokument-ID
            documentSource: Quelle des Dokuments
            documentClass: Optional - Klasse des Dokuments
            documentMimeType: Optional - MIME-Type
            documentInternal: Optional - Interne Dokument-ID
            desc: Optional - Beschreibung
            **kwargs: Weitere Parameter
            
        Returns:
            ExtendedDocumentMetadata: Metadaten des verarbeiteten Dokuments
        """
        try:
            # Dateityp-Erkennung
            file_extension = Path(filename).suffix.upper()
            
            # Proxy-Logik: Entscheide basierend auf Dateityp
            if file_extension in ['.XLSX', '.XLS', '.XLSM', '.XLSB', '.CSV']:
                # RAG-Verarbeitung für Tabellen
                logger.info(f"🔍 RAG-Verarbeitung für Tabellen-Datei: {filename}")
                return await self.process_excel_upload(
                    filename=filename,
                    raw_content=raw_content,
                    document_id=documentId,
                    document_source=documentSource,
                    document_class=documentClass,
                    document_mime_type=documentMimeType,
                    document_internal=documentInternal,
                    description=desc
                )
            else:
                # Weiterleitung an Original Service
                logger.info(f"📄 Original Service für: {filename}")
                return await self.original_service.async_ingest(
                    filename=filename,
                    raw_content=raw_content,
                    documentId=documentId,
                    documentSource=documentSource,
                    documentClass=documentClass,
                    documentMimeType=documentMimeType,
                    documentInternal=documentInternal,
                    **kwargs
                )
                
        except Exception as e:
            logger.error(f"❌ Fehler in Proxy-Methode async_ingest: {str(e)}")
            raise
    
    async def process_excel_upload(self, 
                                 filename: str,
                                 raw_content: bytes,
                                 document_id: str,
                                 document_source: str,
                                 document_class: Optional[str] = None,
                                 document_mime_type: Optional[str] = None,
                                 document_internal: Optional[str] = None,
                                 description: Optional[str] = None) -> ExtendedDocumentMetadata:
        """
        Verarbeitet Excel-Upload und integriert mit RAG-System
        
        Args:
            filename: Name der hochgeladenen Datei
            raw_content: Rohdaten der Datei
            document_id: Eindeutige Dokument-ID
            document_source: Quelle des Dokuments
            document_class: Optional - Klasse des Dokuments
            document_mime_type: Optional - MIME-Type
            document_internal: Optional - Interne Dokument-ID
            description: Optional - Beschreibung
            
        Returns:
            ExtendedDocumentMetadata: Erweiterte Metadaten mit RAG-Informationen
        """
        processing_errors = []
        processing_warnings = []
        
        try:
            logger.info(f"📖 Verarbeite Excel-Upload: {filename}")
            
            # Temporäre Datei erstellen
            temp_file = Path(f"/tmp/{filename}")
            with open(temp_file, 'wb') as f:
                f.write(raw_content)
            
            # Excel-Datei lesen
            try:
                df = pd.read_excel(temp_file, engine='openpyxl')
            except Exception as e:
                error_msg = f"Fehler beim Lesen der Excel-Datei: {str(e)}"
                logger.error(f"❌ {error_msg}")
                processing_errors.append({
                    'message': error_msg,
                    'error_type': 'excel_read_error',
                    'details': {
                        'filename': filename,
                        'file_size': len(raw_content),
                        'error': str(e)
                    },
                    'timestamp': datetime.now().isoformat()
                })
                raise RAGProcessingError(error_msg, 'excel_read_error')
            
            # Excel-Struktur validieren
            missing_columns, warnings = self._validate_excel_structure(df, filename)
            processing_warnings.extend([w.to_dict() for w in warnings])
            
            # Fehler bei fehlenden Pflichtspalten
            if missing_columns:
                error_msg = f"Pflichtspalten fehlen: {', '.join(missing_columns)}"
                logger.error(f"❌ {error_msg}")
                processing_errors.append({
                    'message': error_msg,
                    'error_type': 'missing_required_columns',
                    'details': {
                        'missing_columns': missing_columns,
                        'filename': filename,
                        'available_columns': list(df.columns),
                        'expected_columns': self.expected_columns,
                        'optional_columns': self.optional_columns,
                        'supported_format': "Excel-Datei mit Spalten: Nr., Frage, Antwort (Kommentar optional)"
                    },
                    'timestamp': datetime.now().isoformat()
                })
                
                # Erstelle trotzdem Metadaten mit Fehlerinformationen
                metadata = ExtendedDocumentMetadata(
                    document_id=document_id,
                    document_source=document_source,
                    document_class=document_class,
                    document_mime_type=document_mime_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    document_internal=document_internal,
                    description=description,
                    filename=filename,
                    file_size=len(raw_content),
                    created_at=datetime.now(),
                    total_rows=len(df),
                    total_columns=len(df.columns),
                    qa_pairs=[],  # Keine QA-Paare wegen Fehler
                    processing_errors=processing_errors,
                    processing_warnings=processing_warnings
                )
                
                # Temporäre Datei löschen
                temp_file.unlink()
                
                return metadata
            
            # QA-Paare extrahieren
            qa_pairs = self._extract_qa_pairs_from_dataframe(df)
            
            # RAG-Metadaten erstellen
            rag_metadata = self.metadata_factory.create_document_metadata(
                document_id=document_id,
                document_source=document_source,
                document_class=document_class,
                document_mime_type=document_mime_type,
                total_rows=len(df),
                total_columns=len(df.columns),
                file_path=filename,
                file_size=len(raw_content),
                created_at=datetime.now(),
                additional_metadata={
                    'document_internal': document_internal,
                    'description': description,
                    'qa_pairs_count': len(qa_pairs),
                    'excel_sheet_name': 'Sheet1',  # Standard
                    'processing_method': 'rag_excel_qa_extraction',
                    'processing_errors': processing_errors,
                    'processing_warnings': processing_warnings
                }
            )
            
            # Dokument-Metadaten erstellen
            metadata = ExtendedDocumentMetadata(
                document_id=document_id,
                document_source=document_source,
                document_class=document_class,
                document_mime_type=document_mime_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                document_internal=document_internal,
                description=description,
                filename=filename,
                file_size=len(raw_content),
                created_at=datetime.now(),
                total_rows=len(df),
                total_columns=len(df.columns),
                qa_pairs=qa_pairs,
                rag_metadata=rag_metadata,
                processing_errors=processing_errors,
                processing_warnings=processing_warnings
            )
            
            # In RAG-System speichern (nur wenn keine Fehler)
            if not processing_errors:
                self._save_to_rag_system(metadata, df)
            
            # Temporäre Datei löschen
            temp_file.unlink()
            
            logger.info(f"✅ Excel-Upload verarbeitet: {len(qa_pairs)} QA-Paare, {len(processing_errors)} Fehler, {len(processing_warnings)} Warnungen")
            return metadata
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Verarbeiten des Excel-Uploads: {str(e)}")
            processing_errors.append({
                'message': f"Unerwarteter Fehler: {str(e)}",
                'error_type': 'unexpected_error',
                'details': {
                    'filename': filename,
                    'error': str(e)
                },
                'timestamp': datetime.now().isoformat()
            })
            
            # Erstelle Metadaten mit Fehlerinformationen
            metadata = ExtendedDocumentMetadata(
                document_id=document_id,
                document_source=document_source,
                document_class=document_class,
                document_mime_type=document_mime_type,
                document_internal=document_internal,
                description=description,
                filename=filename,
                file_size=len(raw_content),
                created_at=datetime.now(),
                processing_errors=processing_errors,
                processing_warnings=processing_warnings
            )
            
            return metadata
    
    def _extract_qa_pairs_from_dataframe(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Extrahiert QA-Paare aus DataFrame"""
        qa_pairs = []
        
        # Bereinige Daten
        df = df.dropna(subset=['Frage', 'Antwort'])
        df = df[df['Frage'].str.strip() != '']
        df = df[df['Antwort'].str.strip() != '']
        
        for index, row in df.iterrows():
            try:
                qa_pair = {
                    'question': str(row.get('Frage', '')).strip(),
                    'answer': str(row.get('Antwort', '')).strip(),
                    'comment': str(row.get('Kommentar', '')).strip() if 'Kommentar' in row else None,
                    'row_id': str(row.get('Nr.', f"row_{index}")).strip(),
                    'index': index
                }
                
                if qa_pair['question'] and qa_pair['answer']:
                    qa_pairs.append(qa_pair)
                    
            except Exception as e:
                logger.warning(f"⚠️ Fehler bei Zeile {index}: {str(e)}")
                continue
        
        return qa_pairs
    
    def _save_to_rag_system(self, metadata: ExtendedDocumentMetadata, df: pd.DataFrame):
        """Speichert Daten im RAG-System"""
        try:
            # 1. Dokument-Metadaten in rag_docs speichern
            self._save_document_metadata(metadata)
            
            # 2. QA-Paare mit Embeddings in rag_vectors speichern
            self._save_qa_pairs_with_embeddings(metadata)
            
            logger.info(f"✅ Daten erfolgreich im RAG-System gespeichert")
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Speichern im RAG-System: {str(e)}")
            raise
    
    def _save_document_metadata(self, metadata: ExtendedDocumentMetadata):
        """Speichert Dokument-Metadaten in rag_docs"""
        try:
            # Verwende die RAG-Metadaten aus ExtendedDocumentMetadata
            doc_metadata = metadata.rag_metadata
            
            # Speichere in rag_docs
            with psycopg2.connect(self.docs_connection_string) as conn:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO data_faq_docs (key, namespace, value, created_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (key, namespace) DO UPDATE SET
                        value = EXCLUDED.value,
                        created_at = EXCLUDED.created_at
                        RETURNING id
                    """, (metadata.document_id, "default", json.dumps(doc_metadata), metadata.created_at))
                    
                    doc_id = cur.fetchone()[0]
                    conn.commit()
                    logger.info(f"✅ Dokument-Metadaten gespeichert: {doc_id}")
                    
        except Exception as e:
            logger.error(f"❌ Fehler beim Speichern der Dokument-Metadaten: {str(e)}")
            raise
    
    def _save_qa_pairs_with_embeddings(self, metadata: ExtendedDocumentMetadata):
        """Speichert QA-Paare mit Embeddings in rag_vectors"""
        try:
            if not metadata.qa_pairs:
                logger.warning("⚠️ Keine QA-Paare zum Speichern vorhanden")
                return
            
            # Verwende bestehenden Embedding Service
            if not self.embedding_service:
                logger.error("❌ Kein Embedding Service verfügbar!")
                return
            
            # Speichere in rag_vectors
            with psycopg2.connect(self.vectors_connection_string) as conn:
                with conn.cursor() as cur:
                    for qa_pair in metadata.qa_pairs:
                        try:
                            # Erstelle QA-Metadaten mit MetadataTemplateFactory
                            qa_metadata = self.metadata_factory.create_qa_metadata(
                                question=qa_pair['question'],
                                answer=qa_pair['answer'],
                                document_id=metadata.document_id,
                                document_source=metadata.document_source,
                                row_id=qa_pair['row_id'],
                                comment=qa_pair.get('comment'),
                                additional_metadata={
                                    'document_class': metadata.document_class,
                                    'document_internal': metadata.document_internal,
                                    'filename': metadata.filename,
                                    'row_index': qa_pair['index']
                                }
                            )
                            
                            # Verwende bestehenden Embedding Service
                            question_embedding = self.embedding_service.get_text_embedding(qa_pair['question'])
                            
                            # Erstelle Text-Search-Vektor
                            text_search_content = f"{qa_pair['question']} {qa_pair['answer']}"
                            if qa_pair.get('comment'):
                                text_search_content += f" {qa_pair['comment']}"
                            
                            # Speichere in rag_vectors
                            cur.execute("""
                                INSERT INTO data_faq_vectors 
                                (node_id, text, metadata, embedding, text_search_tsv, created_at)
                                VALUES (%s, %s, %s, %s, to_tsvector('german', %s), %s)
                                ON CONFLICT (node_id) DO UPDATE SET
                                text = EXCLUDED.text,
                                metadata = EXCLUDED.metadata,
                                embedding = EXCLUDED.embedding,
                                text_search_tsv = EXCLUDED.text_search_tsv,
                                created_at = EXCLUDED.created_at
                            """, (
                                f"{metadata.document_id}_{qa_pair['row_id']}",
                                qa_pair['question'],
                                json.dumps(qa_metadata),
                                question_embedding,
                                text_search_content,
                                metadata.created_at
                            ))
                            
                        except Exception as e:
                            logger.warning(f"⚠️ Fehler beim Speichern von QA-Paar {qa_pair['row_id']}: {str(e)}")
                            continue
                    
                    conn.commit()
                    logger.info(f"✅ {len(metadata.qa_pairs)} QA-Paare mit Embeddings gespeichert")
                    
        except Exception as e:
            logger.error(f"❌ Fehler beim Speichern der QA-Paare: {str(e)}")
            raise
    
    def get_rag_stats(self) -> Dict[str, Any]:
        """Holt Statistiken vom RAG-System"""
        try:
            # rag_docs Statistiken
            docs_stats = {'total_documents': 0}
            try:
                with psycopg2.connect(self.docs_connection_string) as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT COUNT(*) as total FROM data_faq_docs")
                        result = cur.fetchone()
                        docs_stats['total_documents'] = result['total'] if result else 0
            except Exception as e:
                logger.warning(f"⚠️ Fehler beim Abrufen der rag_docs Statistiken: {e}")
            
            # rag_vectors Statistiken
            vectors_stats = {
                'total_vectors': 0,
                'with_embeddings': 0,
                'with_text_search': 0
            }
            try:
                with psycopg2.connect(self.vectors_connection_string) as conn:
                    with conn.cursor(cursor_factory=RealDictCursor) as cur:
                        cur.execute("SELECT COUNT(*) as total FROM data_faq_vectors")
                        total_result = cur.fetchone()
                        
                        cur.execute("SELECT COUNT(*) as with_embeddings FROM data_faq_vectors WHERE embedding IS NOT NULL")
                        embeddings_result = cur.fetchone()
                        
                        cur.execute("SELECT COUNT(*) as with_text_search FROM data_faq_vectors WHERE text_search_tsv IS NOT NULL")
                        text_result = cur.fetchone()
                        
                        vectors_stats['total_vectors'] = total_result['total'] if total_result else 0
                        vectors_stats['with_embeddings'] = embeddings_result['with_embeddings'] if embeddings_result else 0
                        vectors_stats['with_text_search'] = text_result['with_text_search'] if text_result else 0
            except Exception as e:
                logger.warning(f"⚠️ Fehler beim Abrufen der rag_vectors Statistiken: {e}")
            
            return {
                'docs_stats': docs_stats,
                'vectors_stats': vectors_stats
            }
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Abrufen der RAG-Statistiken: {e}")
            return {
                'docs_stats': {'total_documents': 0},
                'vectors_stats': {'total_vectors': 0, 'with_embeddings': 0, 'with_text_search': 0}
            }

# Factory-Funktion für die Integration
def get_rag_ingestion_adapter(service_type: str = "default", 
                            embedding_service = None,
                            llm_service = None) -> RAGIngestionAdapter:
    """
    Factory-Funktion für RAG Ingestion Adapter
    
    Args:
        service_type: Art des Services
        embedding_service: Bestehender Embedding Service
        llm_service: Bestehender LLM Service
        
    Returns:
        RAGIngestionAdapter: Konfigurierter Adapter
    """
    return RAGIngestionAdapter(
        embedding_service=embedding_service,
        llm_service=llm_service
    )

# Erweiterte Factory-Funktion für bestehende FAQ Ingestion Service
def get_faq_ingestion_service(service_type: str = "DefaultFAQIngestionService",
                            embedding_service = None,
                            llm_service = None) -> "FAQIngestionService":
    """
    Erweiterte Factory-Funktion für FAQ Ingestion Service mit RAG-Integration
    
    Args:
        service_type: Art des Services
        embedding_service: Bestehender Embedding Service
        llm_service: Bestehender LLM Service
        
    Returns:
        FAQIngestionService: Konfigurierter Service
    """
    
    # Für alle Service-Typen verwenden wir den RAG Adapter (Proxy)
    # Der Adapter entscheidet intern basierend auf Dateityp
    return RAGIngestionAdapter(
        embedding_service=embedding_service,
        llm_service=llm_service
    )
