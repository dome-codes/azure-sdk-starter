#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Datenleser für Excel- und CSV-Dateien mit Datentyp-Erkennung und Fehlerbehandlung
Unterstützt die Spalten: ID, Frage, Antwort, Kommentar
Kann als Bibliothek in andere Services eingebunden werden
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Any, Union, Tuple, Optional
from pathlib import Path
import sys
from dataclasses import dataclass
from datetime import datetime

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('data_reader.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class DocumentMetadata:
    """Metadaten für ein Dokument"""
    document_id: str
    document_source: str
    document_class: str
    document_mime_type: str
    created_at: datetime
    total_rows: int
    total_columns: int

@dataclass
class QuestionAnswerPair:
    """Ein Frage-Antwort-Paar mit Metadaten"""
    question_id: str
    question: str
    answer: str
    comment: Optional[str] = None
    row_index: Optional[int] = None
    confidence_score: Optional[float] = None

class DataTypeDetector:
    """Klasse zur Erkennung und Validierung von Datentypen"""
    
    @staticmethod
    def detect_id_type(value: Any) -> str:
        """Erkennt den Datentyp der ID-Spalte"""
        if pd.isna(value):
            return "NULL"
        
        value_str = str(value).strip()
        
        # Prüfe auf UUID
        if len(value_str) == 36 and value_str.count('-') == 4:
            try:
                import uuid
                uuid.UUID(value_str)
                return "UUID"
            except ValueError:
                pass
        
        # Prüfe auf Integer
        try:
            int_val = int(value_str)
            if 0 <= int_val <= 999999999:
                return "INTEGER"
        except ValueError:
            pass
        
        # Prüfe auf Float
        try:
            float_val = float(value_str)
            if float_val.is_integer():
                return "INTEGER"
            else:
                return "FLOAT"
        except ValueError:
            pass
        
        return "STRING"
    
    @staticmethod
    def detect_text_type(value: Any, max_length: int = 1000) -> str:
        """Erkennt den Datentyp von Text-Spalten"""
        if pd.isna(value):
            return "NULL"
        
        value_str = str(value).strip()
        
        if len(value_str) == 0:
            return "EMPTY"
        elif len(value_str) <= 50:
            return "SHORT_TEXT"
        elif len(value_str) <= 200:
            return "MEDIUM_TEXT"
        elif len(value_str) <= max_length:
            return "LONG_TEXT"
        else:
            return "VERY_LONG_TEXT"
    
    @staticmethod
    def validate_data_types(df: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """Validiert alle Spalten und erkennt Datentypen"""
        column_analysis = {}
        
        for column in df.columns:
            logger.info(f"Analysiere Spalte: {column}")
            
            # Datentyp-Erkennung basierend auf Spaltenname
            if column.lower() == 'id':
                type_func = DataTypeDetector.detect_id_type
            else:
                type_func = DataTypeDetector.detect_text_type
            
            # Analysiere alle Werte in der Spalte
            types = []
            null_count = 0
            empty_count = 0
            unique_values = set()
            
            for value in df[column]:
                if pd.isna(value):
                    null_count += 1
                    types.append("NULL")
                else:
                    detected_type = type_func(value)
                    types.append(detected_type)
                    
                    if detected_type == "EMPTY":
                        empty_count += 1
                    
                    unique_values.add(str(value).strip())
            
            # Häufigste Datentypen
            type_counts = pd.Series(types).value_counts()
            dominant_type = type_counts.index[0] if len(type_counts) > 0 else "UNKNOWN"
            
            column_analysis[column] = {
                'dominant_type': dominant_type,
                'type_distribution': type_counts.to_dict(),
                'null_count': null_count,
                'empty_count': empty_count,
                'unique_count': len(unique_values),
                'total_count': len(df),
                'sample_values': list(unique_values)[:5]  # Erste 5 eindeutige Werte
            }
            
            logger.info(f"  Dominanter Typ: {dominant_type}")
            logger.info(f"  NULL-Werte: {null_count}")
            logger.info(f"  Leere Werte: {empty_count}")
            logger.info(f"  Eindeutige Werte: {len(unique_values)}")
        
        return column_analysis

class DataReader:
    """Hauptklasse für das Einlesen und Verarbeiten von Daten"""
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.data = None
        self.analysis = None
        self.metadata = None
        
        if not self.file_path.exists():
            raise FileNotFoundError(f"Datei nicht gefunden: {file_path}")
    
    def read_file(self) -> pd.DataFrame:
        """Liest die Datei basierend auf der Dateiendung"""
        try:
            file_extension = self.file_path.suffix.lower()
            
            if file_extension in ['.xlsx', '.xls']:
                logger.info(f"Lese Excel-Datei: {self.file_path}")
                self.data = pd.read_excel(self.file_path, engine='openpyxl')
            
            elif file_extension == '.csv':
                logger.info(f"Lese CSV-Datei: {self.file_path}")
                # Versuche verschiedene Encodings
                encodings = ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']
                
                for encoding in encodings:
                    try:
                        self.data = pd.read_csv(self.file_path, encoding=encoding)
                        logger.info(f"Erfolgreich mit Encoding: {encoding}")
                        break
                    except UnicodeDecodeError:
                        continue
                else:
                    raise ValueError("Kein passendes Encoding gefunden")
            
            else:
                raise ValueError(f"Nicht unterstützter Dateityp: {file_extension}")
            
            # Überprüfe erwartete Spalten
            expected_columns = ['ID', 'Frage', 'Antwort', 'Kommentar']
            missing_columns = [col for col in expected_columns if col not in self.data.columns]
            
            if missing_columns:
                logger.warning(f"Fehlende Spalten: {missing_columns}")
                logger.info(f"Verfügbare Spalten: {list(self.data.columns)}")
            
            # Bereinige Spaltennamen (entferne Leerzeichen, normalisiere)
            self.data.columns = self.data.columns.str.strip()
            
            return self.data
            
        except Exception as e:
            logger.error(f"Fehler beim Lesen der Datei: {str(e)}")
            raise
    
    def analyze_data(self) -> Dict[str, Dict[str, Any]]:
        """Analysiert die Daten und erkennt Datentypen"""
        if self.data is None:
            raise ValueError("Keine Daten geladen. Führe zuerst read_file() aus.")
        
        logger.info("Starte Datenanalyse...")
        self.analysis = DataTypeDetector.validate_data_types(self.data)
        return self.analysis
    
    def extract_qa_pairs(self, 
                         id_column: str = 'ID',
                         question_column: str = 'Frage',
                         answer_column: str = 'Antwort',
                         comment_column: str = 'Kommentar') -> List[QuestionAnswerPair]:
        """
        Extrahiert Frage-Antwort-Paare aus den Daten
        Kann in anderen Services für Embeddings verwendet werden
        """
        if self.data is None:
            raise ValueError("Keine Daten geladen. Führe zuerst read_file() aus.")
        
        qa_pairs = []
        
        for index, row in self.data.iterrows():
            try:
                # Extrahiere Werte mit Fehlerbehandlung
                question_id = str(row.get(id_column, f"row_{index}")).strip()
                question = str(row.get(question_column, "")).strip()
                answer = str(row.get(answer_column, "")).strip()
                comment = str(row.get(comment_column, "")).strip() if comment_column in row else None
                
                # Validiere, dass Frage und Antwort nicht leer sind
                if question and answer and question != "nan" and answer != "nan":
                    qa_pair = QuestionAnswerPair(
                        question_id=question_id,
                        question=question,
                        answer=answer,
                        comment=comment if comment and comment != "nan" else None,
                        row_index=index
                    )
                    qa_pairs.append(qa_pair)
                else:
                    logger.warning(f"Zeile {index}: Leere Frage oder Antwort übersprungen")
                    
            except Exception as e:
                logger.error(f"Fehler beim Verarbeiten der Zeile {index}: {str(e)}")
                continue
        
        logger.info(f"Erfolgreich {len(qa_pairs)} Frage-Antwort-Paare extrahiert")
        return qa_pairs
    
    def get_document_metadata(self, 
                             document_id: str,
                             document_source: str,
                             document_class: str = "qa_dataset") -> DocumentMetadata:
        """
        Erstellt Metadaten für das Dokument
        Kann vom Ingestion-Service verwendet werden
        """
        if self.data is None:
            raise ValueError("Keine Daten geladen. Führe zuerst read_file() aus.")
        
        # Bestimme MIME-Type basierend auf Dateiendung
        file_extension = self.file_path.suffix.lower()
        if file_extension in ['.xlsx', '.xls']:
            mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif file_extension == '.csv':
            mime_type = "text/csv"
        else:
            mime_type = "application/octet-stream"
        
        self.metadata = DocumentMetadata(
            document_id=document_id,
            document_source=document_source,
            document_class=document_class,
            document_mime_type=mime_type,
            created_at=datetime.now(),
            total_rows=len(self.data),
            total_columns=len(self.data.columns)
        )
        
        return self.metadata
    
    def get_data_for_embeddings(self) -> Dict[str, Any]:
        """
        Bereitet Daten für Embeddings vor
        Gibt strukturierte Daten zurück, die direkt für Vektorisierung verwendet werden können
        """
        if self.data is None:
            raise ValueError("Keine Daten geladen. Führe zuerst read_file() aus.")
        
        qa_pairs = self.extract_qa_pairs()
        
        # Strukturiere Daten für Embeddings
        embedding_data = {
            'questions': [qa.question for qa in qa_pairs],
            'answers': [qa.answer for qa in qa_pairs],
            'metadata': [{
                'question_id': qa.question_id,
                'row_index': qa.row_index,
                'comment': qa.comment
            } for qa in qa_pairs],
            'total_pairs': len(qa_pairs),
            'document_info': {
                'file_path': str(self.file_path),
                'file_size': self.file_path.stat().st_size,
                'last_modified': datetime.fromtimestamp(self.file_path.stat().st_mtime)
            }
        }
        
        return embedding_data
    
    def validate_data_quality(self) -> Dict[str, Any]:
        """
        Validiert die Datenqualität für Vektorisierung
        Gibt Warnungen und Empfehlungen zurück
        """
        if self.data is None:
            raise ValueError("Keine Daten geladen. Führe zuerst read_file() aus.")
        
        qa_pairs = self.extract_qa_pairs()
        
        quality_report = {
            'total_rows': len(self.data),
            'valid_qa_pairs': len(qa_pairs),
            'invalid_rows': len(self.data) - len(qa_pairs),
            'quality_score': (len(qa_pairs) / len(self.data)) * 100 if len(self.data) > 0 else 0,
            'warnings': [],
            'recommendations': []
        }
        
        # Prüfe auf häufige Probleme
        if quality_report['quality_score'] < 80:
            quality_report['warnings'].append("Niedrige Datenqualität - viele ungültige Zeilen")
            quality_report['recommendations'].append("Daten vor der Vektorisierung bereinigen")
        
        # Prüfe Textlängen für Embeddings
        question_lengths = [len(qa.question) for qa in qa_pairs]
        answer_lengths = [len(qa.answer) for qa in qa_pairs]
        
        if max(question_lengths) > 1000:
            quality_report['warnings'].append("Sehr lange Fragen gefunden - könnten Embedding-Qualität beeinträchtigen")
            quality_report['recommendations'].append("Fragen auf maximale Länge kürzen")
        
        if max(answer_lengths) > 2000:
            quality_report['warnings'].append("Sehr lange Antworten gefunden - könnten Embedding-Qualität beeinträchtigen")
            quality_report['recommendations'].append("Antworten auf maximale Länge kürzen")
        
        return quality_report
    
    def generate_report(self) -> str:
        """Generiert einen detaillierten Bericht über die Daten"""
        if self.analysis is None:
            raise ValueError("Keine Analyse verfügbar. Führe zuerst analyze_data() aus.")
        
        report = []
        report.append("=" * 60)
        report.append("DATENANALYSE-BERICHT")
        report.append("=" * 60)
        report.append(f"Datei: {self.file_path}")
        report.append(f"Zeilen: {len(self.data)}")
        report.append(f"Spalten: {len(self.data.columns)}")
        report.append("")
        
        for column, analysis in self.analysis.items():
            report.append(f"SPALTE: {column}")
            report.append("-" * 40)
            report.append(f"Dominanter Datentyp: {analysis['dominant_type']}")
            report.append(f"NULL-Werte: {analysis['null_count']} ({analysis['null_count']/analysis['total_count']*100:.1f}%)")
            report.append(f"Leere Werte: {analysis['empty_count']} ({analysis['empty_count']/analysis['total_count']*100:.1f}%)")
            report.append(f"Eindeutige Werte: {analysis['unique_count']}")
            report.append(f"Datentyp-Verteilung:")
            
            for dtype, count in analysis['type_distribution'].items():
                percentage = count / analysis['total_count'] * 100
                report.append(f"  {dtype}: {count} ({percentage:.1f}%)")
            
            report.append(f"Beispielwerte: {', '.join(map(str, analysis['sample_values']))}")
            report.append("")
        
        return "\n".join(report)
    
    def get_data_quality_score(self) -> float:
        """Berechnet einen Datenqualitäts-Score (0-100)"""
        if self.analysis is None:
            return 0.0
        
        total_score = 0
        max_score = len(self.analysis) * 100
        
        for column, analysis in self.analysis.items():
            column_score = 100
            
            # Abzug für NULL-Werte
            null_percentage = analysis['null_count'] / analysis['total_count']
            if null_percentage > 0.1:  # Mehr als 10% NULL
                column_score -= 30
            elif null_percentage > 0.05:  # Mehr als 5% NULL
                column_score -= 15
            
            # Abzug für leere Werte
            empty_percentage = analysis['empty_count'] / analysis['total_count']
            if empty_percentage > 0.2:  # Mehr als 20% leer
                column_score -= 20
            elif empty_percentage > 0.1:  # Mehr als 10% leer
                column_score -= 10
            
            # Bonus für konsistente Datentypen
            dominant_percentage = analysis['type_distribution'][analysis['dominant_type']] / analysis['total_count']
            if dominant_percentage > 0.9:  # Mehr als 90% einheitlich
                column_score += 10
            
            column_score = max(0, min(100, column_score))
            total_score += column_score
        
        return (total_score / max_score) * 100

# Hilfsfunktionen für einfache Integration in andere Services
def create_qa_dataset_from_file(file_path: str, 
                               document_id: str,
                               document_source: str) -> Tuple[List[QuestionAnswerPair], DocumentMetadata]:
    """
    Einfache Hilfsfunktion für andere Services
    Gibt QA-Paare und Metadaten zurück
    """
    reader = DataReader(file_path)
    reader.read_file()
    qa_pairs = reader.extract_qa_pairs()
    metadata = reader.get_document_metadata(document_id, document_source)
    return qa_pairs, metadata

def get_embedding_data_from_file(file_path: str) -> Dict[str, Any]:
    """
    Einfache Hilfsfunktion für andere Services
    Gibt Daten direkt für Embeddings zurück
    """
    reader = DataReader(file_path)
    reader.read_file()
    return reader.get_data_for_embeddings()

def validate_file_for_ingestion(file_path: str) -> Dict[str, Any]:
    """
    Validiert eine Datei für den Ingestion-Service
    Gibt Qualitätsbericht und Empfehlungen zurück
    """
    reader = DataReader(file_path)
    reader.read_file()
    reader.analyze_data()
    
    return {
        'quality_score': reader.get_data_quality_score(),
        'quality_report': reader.validate_data_quality(),
        'analysis': reader.analysis,
        'metadata': reader.get_document_metadata("temp_id", "temp_source")
    }

def main():
    """Hauptfunktion für Kommandozeilen-Verwendung"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Datenleser für Excel- und CSV-Dateien')
    parser.add_argument('file_path', help='Pfad zur Excel- oder CSV-Datei')
    parser.add_argument('--report', action='store_true', help='Generiert einen detaillierten Bericht')
    parser.add_argument('--quality', action='store_true', help='Zeigt Datenqualitäts-Score')
    parser.add_argument('--qa-pairs', action='store_true', help='Zeigt extrahierte QA-Paare')
    parser.add_argument('--embedding-data', action='store_true', help='Zeigt Daten für Embeddings')
    
    args = parser.parse_args()
    
    try:
        # Daten einlesen
        reader = DataReader(args.file_path)
        data = reader.read_file()
        
        print(f"✓ Datei erfolgreich eingelesen: {len(data)} Zeilen, {len(data.columns)} Spalten")
        print(f"Spalten: {list(data.columns)}")
        print()
        
        # Daten analysieren
        analysis = reader.analyze_data()
        print("✓ Datenanalyse abgeschlossen")
        print()
        
        # Datenqualitäts-Score
        if args.quality:
            quality_score = reader.get_data_quality_score()
            print(f"Datenqualitäts-Score: {quality_score:.1f}/100")
            print()
        
        # QA-Paare anzeigen
        if args.qa_pairs:
            qa_pairs = reader.extract_qa_pairs()
            print(f"Extrahierte QA-Paare: {len(qa_pairs)}")
            for i, qa in enumerate(qa_pairs[:5]):  # Erste 5 anzeigen
                print(f"  {i+1}. ID: {qa.question_id}")
                print(f"     Frage: {qa.question[:100]}...")
                print(f"     Antwort: {qa.answer[:100]}...")
                print()
        
        # Embedding-Daten anzeigen
        if args.embedding_data:
            embedding_data = reader.get_data_for_embeddings()
            print(f"Embedding-Daten vorbereitet:")
            print(f"  Fragen: {len(embedding_data['questions'])}")
            print(f"  Antworten: {len(embedding_data['answers'])}")
            print(f"  Metadaten: {len(embedding_data['metadata'])}")
            print()
        
        # Detaillierten Bericht
        if args.report:
            report = reader.generate_report()
            print(report)
            
            # Bericht in Datei speichern
            report_file = args.file_path.with_suffix('.report.txt')
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"\nBericht gespeichert in: {report_file}")
        
        # Kurze Zusammenfassung
        print("\nKURZZUSAMMENFASSUNG:")
        for column, analysis in analysis.items():
            print(f"{column}: {analysis['dominant_type']} "
                  f"(NULL: {analysis['null_count']}, "
                  f"Leer: {analysis['empty_count']})")
    
    except Exception as e:
        logger.error(f"Fehler: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()
