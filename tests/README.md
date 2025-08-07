# Tests für RAG SDK

Dieses Verzeichnis enthält alle Tests für das RAG SDK.

## Test-Struktur

```
tests/
├── setup.ts           # Globale Test-Konfiguration
├── sdk.test.ts        # Unit-Tests für das SDK
├── types.test.ts      # TypeScript-Typ-Tests
├── integration.test.ts # Integration-Tests
└── README.md          # Diese Datei
```

## Test-Typen

### 1. Unit-Tests (`sdk.test.ts`)
- Testet einzelne Funktionen und Klassen
- Überprüft Konstruktoren und Interface-Validierung
- Testet Error-Handling

### 2. Type-Tests (`types.test.ts`)
- Überprüft TypeScript-Interfaces
- Testet Typ-Kompatibilität
- Validiert Request/Response-Strukturen

### 3. Integration-Tests (`integration.test.ts`)
- Testet End-to-End-Workflows
- Überprüft API-Integration (falls verfügbar)
- Testet Konfiguration und Setup

## Test-Ausführung

```bash
# Alle Tests ausführen
npm test

# Tests im Watch-Modus
npm run test:watch

# Tests mit Coverage-Report
npm run test:coverage

# Tests für CI/CD
npm run test:ci
```

## Coverage-Report

Nach der Ausführung von `npm run test:coverage` wird ein detaillierter Coverage-Report erstellt:

- **Text-Report**: In der Konsole
- **HTML-Report**: Im `coverage/` Verzeichnis
- **LCOV-Report**: Für CI/CD-Integration

## Test-Konfiguration

Die Tests verwenden:
- **Jest** als Test-Framework
- **ts-jest** für TypeScript-Unterstützung
- **nock** für HTTP-Mocking (optional)

## Best Practices

1. **Test-Namen**: Beschreibend und aussagekräftig
2. **Test-Struktur**: Arrange-Act-Assert Pattern
3. **Mocking**: Nur wenn nötig, echte API-Calls bevorzugen
4. **Coverage**: Mindestens 80% Code-Coverage anstreben
5. **Error-Cases**: Immer auch Fehlerfälle testen

## Neue Tests hinzufügen

1. Erstelle eine neue `.test.ts` Datei im `tests/` Verzeichnis
2. Importiere die zu testenden Module
3. Schreibe beschreibende Test-Cases
4. Führe `npm test` aus, um sicherzustellen, dass alle Tests passen

## Beispiel

```typescript
import { RAGClient } from '../src/sdk';

describe('RAGClient', () => {
  it('should create instance with config', () => {
    const client = new RAGClient({ baseURL: 'https://test.com' });
    expect(client).toBeInstanceOf(RAGClient);
  });
});
``` 