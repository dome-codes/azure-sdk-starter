#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Beispiel für die Integration des DataReaders in einen Ingestion-Service
Zeigt, wie QA-Daten für Embeddings vorbereitet werden können
"""

from data_reader import (
    DataReader, 
    create_qa_dataset_from_file, 
    get_embedding_data_from_file,
    validate_file_for_ingestion,
    DocumentMetadata,
    QuestionAnswerPair
)
import logging
from typing import Dict, Any, List
import uuid
from datetime import datetime

# Logging konfigurieren
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IngestionService:
    """Beispiel-Ingestion-Service, der den DataReader integriert"""
    
    def __init__(self):
        self.processed_documents = []
        self.qa_datasets = []
    
    def ingest_document(self, 
                        file_path: str, 
                        document_source: str,
                        document_class: str = "qa_dataset") -> Dict[str, Any]:
        """
        Verarbeitet ein Dokument und bereitet es für Embeddings vor
        """
        try:
            logger.info(f"Starte Verarbeitung von: {file_path}")
            
            # 1. Dokument validieren
            validation_result = validate_file_for_ingestion(file_path)
            logger.info(f"Datenqualitäts-Score: {validation_result['quality_score']:.1f}/100")
            
            # 2. QA-Daten extrahieren
            qa_pairs, metadata = create_qa_dataset_from_file(
                file_path=file_path,
                document_id=str(uuid.uuid4()),  # Generiere eindeutige ID
                document_source=document_source
            )
            
            # 3. Daten für Embeddings vorbereiten
            embedding_data = get_embedding_data_from_file(file_path)
            
            # 4. Metadaten aktualisieren
            metadata.document_class = document_class
            metadata.created_at = datetime.now()
            
            # 5. Ergebnisse speichern
            result = {
                'document_id': metadata.document_id,
                'document_source': metadata.document_source,
                'document_class': metadata.document_class,
                'document_mime_type': metadata.document_mime_type,
                'created_at': metadata.created_at,
                'total_rows': metadata.total_rows,
                'total_columns': metadata.total_columns,
                'qa_pairs_count': len(qa_pairs),
                'quality_score': validation_result['quality_score'],
                'embedding_data': embedding_data,
                'validation_warnings': validation_result['quality_report']['warnings'],
                'validation_recommendations': validation_result['quality_report']['recommendations']
            }
            
            # 6. In Service speichern
            self.processed_documents.append(result)
            self.qa_datasets.extend(qa_pairs)
            
            logger.info(f"✓ Dokument erfolgreich verarbeitet: {metadata.document_id}")
            logger.info(f"  QA-Paare: {len(qa_pairs)}")
            logger.info(f"  Qualität: {validation_result['quality_score']:.1f}/100")
            
            return result
            
        except Exception as e:
            logger.error(f"Fehler bei der Verarbeitung von {file_path}: {str(e)}")
            raise
    
    def get_questions_for_embedding(self, document_id: str = None) -> List[str]:
        """
        Gibt alle Fragen für Embeddings zurück
        Kann für den Vektorisierungs-Service verwendet werden
        """
        if document_id:
            # Nur Fragen eines bestimmten Dokuments
            questions = [
                qa.question for qa in self.qa_datasets 
                if hasattr(qa, 'document_id') and qa.document_id == document_id
            ]
        else:
            # Alle Fragen
            questions = [qa.question for qa in self.qa_datasets]
        
        return questions
    
    def get_qa_pairs_for_vector_search(self, document_id: str = None) -> List[Dict[str, Any]]:
        """
        Gibt QA-Paare für die Vektorsuche zurück
        Kann für den Vector-Service verwendet werden
        """
        if document_id:
            # Nur QA-Paare eines bestimmten Dokuments
            qa_pairs = [
                qa for qa in self.qa_datasets 
                if hasattr(qa, 'document_id') and qa.document_id == document_id
            ]
        else:
            # Alle QA-Paare
            qa_pairs = self.qa_datasets
        
        # Konvertiere zu Dictionary-Format für Vektorsuche
        vector_data = []
        for qa in qa_pairs:
            vector_data.append({
                'id': qa.question_id,
                'question': qa.question,
                'answer': qa.answer,
                'comment': qa.comment,
                'metadata': {
                    'row_index': qa.row_index,
                    'document_id': getattr(qa, 'document_id', None),
                    'document_source': getattr(qa, 'document_source', None)
                }
            })
        
        return vector_data
    
    def get_document_statistics(self) -> Dict[str, Any]:
        """Gibt Statistiken über alle verarbeiteten Dokumente zurück"""
        if not self.processed_documents:
            return {}
        
        total_qa_pairs = sum(doc['qa_pairs_count'] for doc in self.processed_documents)
        avg_quality = sum(doc['quality_score'] for doc in self.processed_documents) / len(self.processed_documents)
        
        return {
            'total_documents': len(self.processed_documents),
            'total_qa_pairs': total_qa_pairs,
            'average_quality_score': avg_quality,
            'document_sources': list(set(doc['document_source'] for doc in self.processed_documents)),
            'document_classes': list(set(doc['document_class'] for doc in self.processed_documents))
        }

def example_usage():
    """Beispiel für die Verwendung des Ingestion-Service"""
    
    # Service initialisieren
    ingestion_service = IngestionService()
    
    # Beispiel-Datei verarbeiten (ersetze durch echten Pfad)
    example_file = "example_data.xlsx"  # Diese Datei existiert nicht, nur als Beispiel
    
    try:
        # Dokument verarbeiten
        result = ingestion_service.ingest_document(
            file_path=example_file,
            document_source="internal_database",
            document_class="faq_dataset"
        )
        
        print("=== VERARBEITUNGSERGEBNIS ===")
        print(f"Dokument-ID: {result['document_id']}")
        print(f"Quelle: {result['document_source']}")
        print(f"QA-Paare: {result['qa_pairs_count']}")
        print(f"Qualitäts-Score: {result['quality_score']:.1f}/100")
        
        # Fragen für Embeddings abrufen
        questions = ingestion_service.get_questions_for_embedding()
        print(f"\nFragen für Embeddings: {len(questions)}")
        
        # QA-Paare für Vektorsuche abrufen
        qa_pairs = ingestion_service.get_qa_pairs_for_vector_search()
        print(f"QA-Paare für Vektorsuche: {len(qa_pairs)}")
        
        # Statistiken anzeigen
        stats = ingestion_service.get_document_statistics()
        print(f"\n=== STATISTIKEN ===")
        print(f"Verarbeitete Dokumente: {stats['total_documents']}")
        print(f"Gesamte QA-Paare: {stats['total_qa_pairs']}")
        print(f"Durchschnittliche Qualität: {stats['average_quality_score']:.1f}/100")
        
    except FileNotFoundError:
        print(f"Beispiel-Datei {example_file} nicht gefunden.")
        print("Verwende den Service mit echten Dateien.")
        
        # Zeige, wie der Service mit echten Dateien verwendet werden kann
        print("\n=== VERWENDUNG MIT ECHTEN DATEIEN ===")
        print("1. Excel-Datei verarbeiten:")
        print("   result = ingestion_service.ingest_document('path/to/file.xlsx', 'source', 'class')")
        print()
        print("2. Fragen für Embeddings abrufen:")
        print("   questions = ingestion_service.get_questions_for_embedding()")
        print()
        print("3. QA-Paare für Vektorsuche abrufen:")
        print("   qa_pairs = ingestion_service.get_qa_pairs_for_vector_search()")

if __name__ == "__main__":
    example_usage()
