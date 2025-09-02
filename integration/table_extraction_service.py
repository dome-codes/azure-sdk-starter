#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TableExtractionService - Spezialisiert für Excel/Tabellen-Extraktion
"""

import logging
import pandas as pd
from pathlib import Path
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TableExtractionResult:
    """Ergebnis der Tabellen-Extraktion"""
    content: str
    metadata: Dict[str, Any]
    qa_pairs: List[Dict[str, Any]]
    sheet_name: str
    total_rows: int
    total_columns: int
    processing_errors: List[Dict[str, Any]]
    processing_warnings: List[Dict[str, Any]]

class TableExtractionService:
    """
    Spezialisierter Service für Excel/Tabellen-Extraktion
    """
    
    def __init__(self):
        # Erwartete Spalten für QA-Struktur
        self.expected_columns = ['Nr.', 'Frage', 'Antwort']
        self.optional_columns = ['Kommentar']
        
        # Erwartete Tabellenblätter (in Reihenfolge der Priorität)
        self.expected_sheets = ['Test_Chatbot', 'FAQ_DEUTSCH', 'FAQ_English']
        
        logger.info("✅ TableExtractionService initialisiert")
    
    def _find_valid_sheet(self, excel_file: Path) -> tuple[Optional[str], Optional[pd.DataFrame]]:
        """
        Findet das erste Tabellenblatt mit der richtigen Struktur
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
    
    def _validate_excel_structure(self, df: pd.DataFrame, filename: str, sheet_name: str) -> tuple[List[str], List[Dict[str, Any]]]:
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
                warnings.append({
                    'message': f"Optionale Spalte '{optional_col}' fehlt im Tabellenblatt '{sheet_name}'",
                    'warning_type': "missing_optional_column",
                    'details': {
                        'column_name': optional_col,
                        'filename': filename,
                        'sheet_name': sheet_name,
                        'available_columns': list(df.columns),
                        'expected_columns': self.expected_columns,
                        'optional_columns': self.optional_columns
                    }
                })
        
        # Überprüfe unbekannte Spalten
        all_known_columns = self.expected_columns + self.optional_columns
        unknown_columns = [col for col in df.columns if col not in all_known_columns]
        
        if unknown_columns:
            warnings.append({
                'message': f"Unbekannte Spalten gefunden in '{sheet_name}': {', '.join(unknown_columns)}",
                'warning_type': "unknown_columns",
                'details': {
                    'unknown_columns': unknown_columns,
                    'filename': filename,
                    'sheet_name': sheet_name,
                    'available_columns': list(df.columns),
                    'expected_columns': self.expected_columns,
                    'optional_columns': self.optional_columns,
                    'supported_format': "Excel-Datei mit Spalten: Nr., Frage, Antwort (Kommentar optional)"
                }
            })
        
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
    
    def _prepare_content_for_chunking(self, df: pd.DataFrame, qa_pairs: List[Dict[str, Any]], sheet_name: str) -> str:
        """
        Bereitet Inhalt für Chunking vor
        Konvertiert QA-Paare in strukturierten Text
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
    
    async def extract(self, 
                     filename: str,
                     raw_content: bytes,
                     **kwargs) -> TableExtractionResult:
        """
        Extrahiert Inhalt aus Excel/Tabellen-Datei
        
        Args:
            filename: Dateiname
            raw_content: Roher Dateiinhalt
            **kwargs: Zusätzliche Parameter
            
        Returns:
            TableExtractionResult: Extraktionsergebnis
        """
        processing_errors = []
        processing_warnings = []
        
        try:
            logger.info(f"📖 Extrahiere Inhalt aus Excel: {filename}")
            
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
                    }
                })
                
                # Temporäre Datei löschen
                temp_file.unlink()
                
                return TableExtractionResult(
                    content="",
                    metadata={},
                    qa_pairs=[],
                    sheet_name="",
                    total_rows=0,
                    total_columns=0,
                    processing_errors=processing_errors,
                    processing_warnings=processing_warnings
                )
            
            # Excel-Struktur validieren
            missing_columns, warnings = self._validate_excel_structure(df, filename, sheet_name)
            processing_warnings.extend(warnings)
            
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
                    }
                })
                
                # Temporäre Datei löschen
                temp_file.unlink()
                
                return TableExtractionResult(
                    content="",
                    metadata={},
                    qa_pairs=[],
                    sheet_name=sheet_name,
                    total_rows=len(df),
                    total_columns=len(df.columns),
                    processing_errors=processing_errors,
                    processing_warnings=processing_warnings
                )
            
            # QA-Paare extrahieren
            qa_pairs = self._extract_qa_pairs_from_dataframe(df)
            
            # Inhalt für Chunking vorbereiten
            content = self._prepare_content_for_chunking(df, qa_pairs, sheet_name)
            
            # Metadaten erstellen
            metadata = {
                'extraction_type': 'table',
                'sheet_name': sheet_name,
                'total_rows': len(df),
                'total_columns': len(df.columns),
                'qa_pairs_count': len(qa_pairs),
                'expected_columns': self.expected_columns,
                'optional_columns': self.optional_columns,
                'available_columns': list(df.columns),
                'filename': filename,
                'processing_errors': processing_errors,
                'processing_warnings': processing_warnings
            }
            
            # Temporäre Datei löschen
            temp_file.unlink()
            
            logger.info(f"✅ Excel-Extraktion erfolgreich: {len(qa_pairs)} QA-Paare aus Tabellenblatt '{sheet_name}'")
            
            return TableExtractionResult(
                content=content,
                metadata=metadata,
                qa_pairs=qa_pairs,
                sheet_name=sheet_name,
                total_rows=len(df),
                total_columns=len(df.columns),
                processing_errors=processing_errors,
                processing_warnings=processing_warnings
            )
            
        except Exception as e:
            logger.error(f"❌ Fehler bei Excel-Extraktion: {str(e)}")
            processing_errors.append({
                'message': f"Unerwarteter Fehler: {str(e)}",
                'error_type': 'unexpected_error',
                'details': {
                    'filename': filename,
                    'error': str(e)
                }
            })
            
            return TableExtractionResult(
                content="",
                metadata={},
                qa_pairs=[],
                sheet_name="",
                total_rows=0,
                total_columns=0,
                processing_errors=processing_errors,
                processing_warnings=processing_warnings
            )
