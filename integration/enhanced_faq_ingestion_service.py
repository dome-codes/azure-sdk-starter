#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Aktualisierte get_faq_ingestion_service - Spezialisierte Pipeline für Tabellen
"""

import logging
from pathlib import Path
from typing import Optional

# Import der spezialisierten Tabellen-Services
from .table_faq_ingestion_service import create_table_faq_ingestion_service, TableFAQIngestionService

logger = logging.getLogger(__name__)

def get_faq_ingestion_service(service_type: str = "default", **kwargs):
    """
    Erstellt spezialisierte FAQ Ingestion Services basierend auf Service-Type
    
    Args:
        service_type: Art des Services ("table", "default", etc.)
        **kwargs: Zusätzliche Parameter
        
    Returns:
        Spezialisierter Service
    """
    
    if service_type == "table":
        """
        SPEZIALISIERTE TABELLEN-PIPELINE
        Verwendet:
        - TableExtractionService (statt UTF8ExtractionService)
        - TableChunkingService (statt normaler ChunkingService)
        - AzureOpenAIEmbeddingService (bestehender)
        - PostgreSQLVectorService (bestehender)
        - Kein SummaryService (nicht benötigt für Tabellen)
        """
        logger.info("🔧 Erstelle spezialisierte Tabellen-Pipeline")
        
        # Bestehende Services aus deiner Konfiguration holen
        embedding_service = kwargs.get('embedding_service')
        vector_service = kwargs.get('vector_service')
        
        if not embedding_service:
            raise ValueError("embedding_service (AzureOpenAIEmbeddingService) muss für Tabellen-Pipeline bereitgestellt werden")
        
        if not vector_service:
            raise ValueError("vector_service (PostgreSQLVectorService) muss für Tabellen-Pipeline bereitgestellt werden")
        
        # Spezialisierte Tabellen-Pipeline erstellen
        table_service = create_table_faq_ingestion_service(
            embedding_service=embedding_service,
            vector_service=vector_service,
            max_chunk_size=kwargs.get('max_chunk_size', 1000),
            overlap=kwargs.get('overlap', 100)
        )
        
        logger.info("✅ Spezialisierte Tabellen-Pipeline erstellt")
        return table_service
        
    elif service_type == "default":
        """
        STANDARD-PIPELINE (dein bestehender Service)
        Verwendet:
        - UTF8ExtractionService
        - Standard ChunkingService
        - AzureOpenAIEmbeddingService
        - PostgreSQLVectorService
        - SummaryService (falls benötigt)
        """
        logger.info("🔧 Verwende Standard-Pipeline")
        
        # Hier würdest du deinen bestehenden Service zurückgeben
        # Beispiel (anpassen an deine tatsächliche Implementierung):
        from your_existing_module import get_default_faq_ingestion_service
        return get_default_faq_ingestion_service(**kwargs)
        
    else:
        raise ValueError(f"Unbekannter Service-Type: {service_type}. Unterstützt: 'table', 'default'")

# Hilfsfunktion für einfache Verwendung
def get_table_faq_ingestion_service(embedding_service, vector_service, **kwargs) -> TableFAQIngestionService:
    """
    Direkte Factory für Tabellen-Pipeline
    
    Args:
        embedding_service: AzureOpenAIEmbeddingService
        vector_service: PostgreSQLVectorService
        **kwargs: Zusätzliche Parameter
        
    Returns:
        TableFAQIngestionService: Spezialisierte Pipeline
    """
    return get_faq_ingestion_service(
        service_type="table",
        embedding_service=embedding_service,
        vector_service=vector_service,
        **kwargs
    )

# Beispiel für Integration in bestehende Struktur
def integrate_table_service_into_existing_pipeline():
    """
    Beispiel: Wie du die Tabellen-Pipeline in deine bestehende Struktur integrierst
    """
    
    # 1. Bestehende Services holen (aus deiner Konfiguration)
    embedding_service = get_embedding_service()  # AzureOpenAIEmbeddingService
    vector_service = get_vector_service()        # PostgreSQLVectorService
    
    # 2. Spezialisierte Tabellen-Pipeline erstellen
    table_service = get_table_faq_ingestion_service(
        embedding_service=embedding_service,
        vector_service=vector_service,
        max_chunk_size=1000,
        overlap=100
    )
    
    # 3. In bestehende get_faq_ingestion_service integrieren
    def enhanced_get_faq_ingestion_service(service_type: str = "default", **kwargs):
        if service_type == "table":
            return table_service
        else:
            # Dein bestehender Service
            return get_original_faq_ingestion_service(service_type, **kwargs)
    
    return enhanced_get_faq_ingestion_service
