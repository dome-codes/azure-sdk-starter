#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RAG Ingestion Adapter - Vereinfacht
Nur Excel-Daten vorbereiten und an bestehenden FAQIngestionService delegieren
"""

import os
import logging
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import pandas as pd

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
    
    # Fehlerbehandlung
    processing_errors: Optional[List[Dict[str, Any]]] = None
    processing_warnings: Optional[List[Dict[str, Any]]] = None

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

class RAGIngestionAdapter:
    """
    Vereinfachter RAG Adapter
    NUR Excel-Daten vorbereiten und an bestehenden Service delegieren
    """
    
    def __init__(self, original_service):
        # Original Service (dein bestehender FAQIngestionService)
        self.original_service = original_service
        
        # Erwartete Excel-Spalten
        self.expected_columns = ['Nr.', 'Frage', 'Antwort']
        self.optional_columns = ['Kommentar']
        
        # Erwartete Tabellenblätter (in Reihenfolge der Priorität)
        self.expected_sheets = ['Test_Chatbot', 'FAQ_DEUTSCH', 'FAQ_English']
        
        logger.info("✅ RAG Ingestion Adapter (vereinfacht) erfolgreich initialisiert")
    
    def _find_valid_sheet(self, excel_file: Path) -> tuple[Optional[str], Optional[pd.DataFrame]]:
        """
        Findet das erste Tabellenblatt mit der richtigen Struktur
        
        Args:
            excel_file: Pfad zur Excel-Datei
            
        Returns:
            tuple: (sheet_name, dataframe) oder (None, None) wenn kein gültiges Blatt gefunden
        """
        try:
            # Alle Tabellenblätter lesen
            excel_file_obj = pd.ExcelFile(excel_file)
            available_sheets = excel_file_obj.sheet_names
            
            logger.info(f"📋 Verfügbare Tabellenblätter: {available_sheets}")
            
            # Suche nach dem ersten Blatt mit der richtigen Struktur
            for sheet_name in self.expected_sheets:
                if sheet_name in available_sheets:
                    logger.info(f"🔍 Prüfe Tabellenblatt: {sheet_name}")
                    
                    # Blatt lesen
                    df = pd.read_excel(excel_file, sheet_name=sheet_name)
                    
                    # Prüfe ob die erwarteten Spalten vorhanden sind
                    missing_columns = [col for col in self.expected_columns if col not in df.columns]
                    
                    if not missing_columns:
                        logger.info(f"✅ Gültiges Tabellenblatt gefunden: {sheet_name}")
                        return sheet_name, df
                    else:
                        logger.warning(f"⚠️ Tabellenblatt {sheet_name} hat nicht die erwartete Struktur. Fehlende Spalten: {missing_columns}")
                        logger.info(f"📋 Verfügbare Spalten in {sheet_name}: {list(df.columns)}")
            
            # Wenn kein erwartetes Blatt gefunden, suche in allen Blättern
            logger.info("🔍 Suche in allen verfügbaren Tabellenblättern...")
            for sheet_name in available_sheets:
                logger.info(f"🔍 Prüfe Tabellenblatt: {sheet_name}")
                
                # Blatt lesen
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                
                # Prüfe ob die erwarteten Spalten vorhanden sind
                missing_columns = [col for col in self.expected_columns if col not in df.columns]
                
                if not missing_columns:
                    logger.info(f"✅ Gültiges Tabellenblatt gefunden: {sheet_name}")
                    return sheet_name, df
                else:
                    logger.info(f"📋 Verfügbare Spalten in {sheet_name}: {list(df.columns)}")
            
            logger.error("❌ Kein Tabellenblatt mit der erwarteten Struktur gefunden")
            return None, None
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Lesen der Excel-Datei: {str(e)}")
            return None, None
    
    def _validate_excel_structure(self, df: pd.DataFrame, filename: str, sheet_name: str) -> tuple[List[str], List[RAGProcessingWarning]]:
        """
        Validiert die Excel-Struktur und gibt Fehler/Warnungen zurück
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
                    message=f"Optionale Spalte '{optional_col}' fehlt im Tabellenblatt '{sheet_name}'",
                    warning_type="missing_optional_column",
                    details={
                        'column_name': optional_col,
                        'filename': filename,
                        'sheet_name': sheet_name,
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
                message=f"Unbekannte Spalten gefunden in '{sheet_name}': {', '.join(unknown_columns)}",
                warning_type="unknown_columns",
                details={
                    'unknown_columns': unknown_columns,
                    'filename': filename,
                    'sheet_name': sheet_name,
                    'available_columns': list(df.columns),
                    'expected_columns': self.expected_columns,
                    'optional_columns': self.optional_columns,
                    'supported_format': "Excel-Datei mit Spalten: Nr., Frage, Antwort (Kommentar optional)"
                }
            ))
        
        return missing_columns, warnings
    
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
    
    def _prepare_excel_content_for_ingestion(self, df: pd.DataFrame, qa_pairs: List[Dict[str, Any]], sheet_name: str) -> str:
        """
        Bereitet Excel-Inhalt für bestehenden Ingestion Service vor
        Konvertiert QA-Paare in Text-Format
        """
        content_lines = []
        
        # Header
        content_lines.append(f"# FAQ-Daten aus Excel (Tabellenblatt: {sheet_name})")
        content_lines.append("")
        
        # QA-Paare als strukturierten Text
        for qa_pair in qa_pairs:
            content_lines.append(f"## Frage {qa_pair['row_id']}")
            content_lines.append("")
            content_lines.append(f"**Frage:** {qa_pair['question']}")
            content_lines.append("")
            content_lines.append(f"**Antwort:** {qa_pair['answer']}")
            
            if qa_pair.get('comment'):
                content_lines.append("")
                content_lines.append(f"**Kommentar:** {qa_pair['comment']}")
            
            content_lines.append("")
            content_lines.append("---")
            content_lines.append("")
        
        return "\n".join(content_lines)
    
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
        Verarbeitet Excel-Upload und delegiert an bestehenden Service
        """
        processing_errors = []
        processing_warnings = []
        
        try:
            logger.info(f"📖 Verarbeite Excel-Upload: {filename}")
            
            # Temporäre Datei erstellen
            temp_file = Path(f"/tmp/{filename}")
            with open(temp_file, 'wb') as f:
                f.write(raw_content)
            
            # Gültiges Tabellenblatt finden
            sheet_name, df = self._find_valid_sheet(temp_file)
            
            if sheet_name is None or df is None:
                error_msg = "Kein Tabellenblatt mit der erwarteten Struktur gefunden"
                logger.error(f"❌ {error_msg}")
                processing_errors.append({
                    'message': error_msg,
                    'error_type': 'no_valid_sheet',
                    'details': {
                        'filename': filename,
                        'expected_sheets': self.expected_sheets,
                        'supported_format': "Excel-Datei mit Spalten: Nr., Frage, Antwort (Kommentar optional)"
                    },
                    'timestamp': datetime.now().isoformat()
                })
                
                # Erstelle Metadaten mit Fehlerinformationen
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
                    processing_errors=processing_errors,
                    processing_warnings=processing_warnings
                )
                
                # Temporäre Datei löschen
                temp_file.unlink()
                
                return metadata
            
            # Excel-Struktur validieren
            missing_columns, warnings = self._validate_excel_structure(df, filename, sheet_name)
            processing_warnings.extend([w.to_dict() for w in warnings])
            
            # Fehler bei fehlenden Pflichtspalten
            if missing_columns:
                error_msg = f"Pflichtspalten fehlen im Tabellenblatt '{sheet_name}': {', '.join(missing_columns)}"
                logger.error(f"❌ {error_msg}")
                processing_errors.append({
                    'message': error_msg,
                    'error_type': 'missing_required_columns',
                    'details': {
                        'missing_columns': missing_columns,
                        'filename': filename,
                        'sheet_name': sheet_name,
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
                    qa_pairs=[],
                    processing_errors=processing_errors,
                    processing_warnings=processing_warnings
                )
                
                # Temporäre Datei löschen
                temp_file.unlink()
                
                return metadata
            
            # QA-Paare extrahieren
            qa_pairs = self._extract_qa_pairs_from_dataframe(df)
            
            # Excel-Inhalt für bestehenden Service vorbereiten
            prepared_content = self._prepare_excel_content_for_ingestion(df, qa_pairs, sheet_name)
            
            # Temporäre Datei löschen
            temp_file.unlink()
            
            # AN BESTEHENDEN SERVICE DELEGIEREN!
            # Der bestehende Service macht alles: Metadaten, Hash, Extraction, etc.
            logger.info(f"🔄 Delegiere an bestehenden FAQIngestionService (Tabellenblatt: {sheet_name})")
            
            # Erstelle temporäre Datei mit vorbereitetem Inhalt
            temp_content_file = Path(f"/tmp/{filename}_{sheet_name}.txt")
            with open(temp_content_file, 'w', encoding='utf-8') as f:
                f.write(prepared_content)
            
            # Lese vorbereiteten Inhalt
            with open(temp_content_file, 'rb') as f:
                prepared_raw_content = f.read()
            
            # Delegiere an bestehenden Service
            metadata = await self.original_service.async_ingest(
                filename=f"{filename}_{sheet_name}.txt",  # Ändere Extension zu .txt
                raw_content=prepared_raw_content,
                documentId=document_id,
                documentSource=document_source,
                documentClass=document_class,
                documentMimeType="text/plain",  # Ändere zu text/plain
                documentInternal=document_internal,
                desc=description
            )
            
            # Temporäre Datei löschen
            temp_content_file.unlink()
            
            # Erweitere Metadaten um RAG-spezifische Informationen
            extended_metadata = ExtendedDocumentMetadata(
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
                processing_errors=processing_errors,
                processing_warnings=processing_warnings
            )
            
            logger.info(f"✅ Excel-Upload erfolgreich verarbeitet: {len(qa_pairs)} QA-Paare aus Tabellenblatt '{sheet_name}'")
            return extended_metadata
            
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

# Vereinfachte Factory-Funktion
def create_rag_adapter(original_service) -> RAGIngestionAdapter:
    """
    Erstellt RAG Adapter mit bestehendem Service
    
    Args:
        original_service: Dein bestehender FAQIngestionService
        
    Returns:
        RAGIngestionAdapter: Konfigurierter Adapter
    """
    return RAGIngestionAdapter(original_service=original_service)
