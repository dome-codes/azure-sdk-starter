#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TableChunkingService - Spezialisiert für Tabellen-Chunking
"""

import logging
from typing import List, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class TableChunk:
    """Ein Chunk für Tabellen-Daten"""
    content: str
    metadata: Dict[str, Any]
    chunk_id: str
    qa_pairs: List[Dict[str, Any]]  # QA-Paare in diesem Chunk

@dataclass
class TableChunkingResult:
    """Ergebnis des Tabellen-Chunkings"""
    chunks: List[TableChunk]
    total_chunks: int
    metadata: Dict[str, Any]

class TableChunkingService:
    """
    Spezialisierter Service für Tabellen-Chunking
    Behält QA-Paare als Einheiten zusammen
    """
    
    def __init__(self, max_chunk_size: int = 1000, overlap: int = 100):
        self.max_chunk_size = max_chunk_size
        self.overlap = overlap
        logger.info("✅ TableChunkingService initialisiert")
    
    def _split_content_into_chunks(self, content: str, qa_pairs: List[Dict[str, Any]]) -> List[TableChunk]:
        """
        Teilt Inhalt in Chunks auf, behält QA-Paare als Einheiten
        """
        chunks = []
        current_chunk_content = []
        current_chunk_qa_pairs = []
        current_size = 0
        chunk_id = 0
        
        # Teile Inhalt in Zeilen
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            line_size = len(line) + 1  # +1 für Zeilenumbruch
            
            # Wenn neue Frage beginnt und Chunk würde zu groß
            if (line.startswith('## Frage') and 
                current_size + line_size > self.max_chunk_size and 
                current_chunk_content):
                
                # Erstelle aktuellen Chunk
                chunk_content = '\n'.join(current_chunk_content)
                chunk = TableChunk(
                    content=chunk_content,
                    metadata={
                        'chunk_type': 'table_qa',
                        'qa_pairs_count': len(current_chunk_qa_pairs),
                        'chunk_size': len(chunk_content),
                        'chunk_id': f"table_chunk_{chunk_id}"
                    },
                    chunk_id=f"table_chunk_{chunk_id}",
                    qa_pairs=current_chunk_qa_pairs.copy()
                )
                chunks.append(chunk)
                
                # Starte neuen Chunk
                chunk_id += 1
                current_chunk_content = []
                current_chunk_qa_pairs = []
                current_size = 0
                
                # Füge Overlap hinzu (letzte Zeilen des vorherigen Chunks)
                if self.overlap > 0 and chunks:
                    overlap_lines = current_chunk_content[-3:]  # Letzte 3 Zeilen
                    current_chunk_content.extend(overlap_lines)
                    current_size = sum(len(line) + 1 for line in overlap_lines)
            
            # Füge Zeile zum aktuellen Chunk hinzu
            current_chunk_content.append(line)
            current_size += line_size
            
            # Wenn neue Frage beginnt, markiere QA-Paar
            if line.startswith('## Frage'):
                # Finde das entsprechende QA-Paar
                qa_index = len(current_chunk_qa_pairs)
                if qa_index < len(qa_pairs):
                    current_chunk_qa_pairs.append(qa_pairs[qa_index])
        
        # Erstelle letzten Chunk
        if current_chunk_content:
            chunk_content = '\n'.join(current_chunk_content)
            chunk = TableChunk(
                content=chunk_content,
                metadata={
                    'chunk_type': 'table_qa',
                    'qa_pairs_count': len(current_chunk_qa_pairs),
                    'chunk_size': len(chunk_content),
                    'chunk_id': f"table_chunk_{chunk_id}"
                },
                chunk_id=f"table_chunk_{chunk_id}",
                qa_pairs=current_chunk_qa_pairs.copy()
            )
            chunks.append(chunk)
        
        return chunks
    
    async def chunk(self, 
                   content: str,
                   metadata: Dict[str, Any],
                   qa_pairs: List[Dict[str, Any]] = None,
                   **kwargs) -> TableChunkingResult:
        """
        Chunked Tabellen-Inhalt
        
        Args:
            content: Zu chunkender Inhalt
            metadata: Metadaten
            qa_pairs: QA-Paare (optional, wird aus content extrahiert wenn nicht vorhanden)
            **kwargs: Zusätzliche Parameter
            
        Returns:
            TableChunkingResult: Chunking-Ergebnis
        """
        try:
            logger.info(f"🔪 Chunked Tabellen-Inhalt (Größe: {len(content)} Zeichen)")
            
            # QA-Paare aus Metadaten extrahieren falls nicht vorhanden
            if qa_pairs is None:
                qa_pairs = metadata.get('qa_pairs', [])
            
            # Inhalt in Chunks aufteilen
            chunks = self._split_content_into_chunks(content, qa_pairs)
            
            # Erweiterte Metadaten
            chunking_metadata = {
                **metadata,
                'chunking_type': 'table_qa',
                'max_chunk_size': self.max_chunk_size,
                'overlap': self.overlap,
                'total_chunks': len(chunks),
                'total_qa_pairs': len(qa_pairs),
                'average_chunk_size': sum(len(chunk.content) for chunk in chunks) / len(chunks) if chunks else 0
            }
            
            logger.info(f"✅ Tabellen-Chunking erfolgreich: {len(chunks)} Chunks erstellt")
            
            return TableChunkingResult(
                chunks=chunks,
                total_chunks=len(chunks),
                metadata=chunking_metadata
            )
            
        except Exception as e:
            logger.error(f"❌ Fehler beim Tabellen-Chunking: {str(e)}")
            raise
