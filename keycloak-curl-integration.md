# Keycloak Integration mit cURL

Diese Dokumentation zeigt, wie Sie sich mit Keycloak über cURL verbinden und den zurückgelieferten Token für API-Aufrufe verwenden können.

## Voraussetzungen

- Keycloak-Server läuft und ist erreichbar
- Ein Realm und Client sind konfiguriert
- Benutzer mit Username/Password existiert

## 1. Token von Keycloak abrufen

### Request Body
```json
{
  "username": "your_username",
  "password": "your_password",
  "grant_type": "password",
  "client_id": "your_client_id"
}
```

### cURL-Befehl
```bash
curl -X POST \
  "http://localhost:8080/auth/realms/your_realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password&grant_type=password&client_id=your_client_id"
```

### cURL-Befehl mit CA-Zertifikat (optional)
```bash
curl -X POST \
  "https://localhost:8443/auth/realms/your_realm/protocol/openid-connect/token" \
  --cacert /path/to/ca-certificate.pem \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password&grant_type=password&client_id=your_client_id"
```

### cURL-Befehl mit CA-Zertifikat und Client-Zertifikat (optional)
```bash
curl -X POST \
  "https://localhost:8443/auth/realms/your_realm/protocol/openid-connect/token" \
  --cacert /path/to/ca-certificate.pem \
  --cert /path/to/client-certificate.pem \
  --key /path/to/client-key.pem \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password&grant_type=password&client_id=your_client_id"
```

### Beispiel Response
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "not-before-policy": 0,
  "session_state": "12345678-1234-1234-1234-123456789012",
  "scope": "openid email profile"
}
```

## 2. API mit Token aufrufen

### Completions API mit API-Version und Modell
```bash
curl -X POST \
  "https://api.example.com/v1/completions?api-version=2024-01-01&model=gpt-4" \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Erkläre mir die Grundlagen von Machine Learning"
      }
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }'
```

## 3. Vollständiges Beispiel-Skript

```bash
#!/bin/bash

# Keycloak-Konfiguration
KEYCLOAK_URL="http://localhost:8080/auth"
REALM="your_realm"
CLIENT_ID="your_client_id"
USERNAME="your_username"
PASSWORD="your_password"

# Token abrufen
echo "Token von Keycloak abrufen..."
TOKEN_RESPONSE=$(curl -s -X POST \
  "$KEYCLOAK_URL/realms/$REALM/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$USERNAME&password=$PASSWORD&grant_type=password&client_id=$CLIENT_ID")

# Token extrahieren
ACCESS_TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Fehler beim Abrufen des Tokens"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
fi

echo "Token erfolgreich abgerufen"
echo "Token: ${ACCESS_TOKEN:0:50}..."

# API mit Token aufrufen
echo "API mit Token aufrufen..."
API_RESPONSE=$(curl -s -X POST \
  "https://api.example.com/v1/completions?api-version=2024-01-01&model=gpt-4" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Erkläre mir die Grundlagen von Machine Learning"
      }
    ],
    "max_tokens": 100,
    "temperature": 0.7
  }')

echo "API Response: $API_RESPONSE"
```

## 4. Fehlerbehandlung

### Token abgelaufen
```json
{
  "error": "invalid_token",
  "error_description": "Token is expired"
}
```

### Ungültige Credentials
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid user credentials"
}
```

### Unauthorized
```json
{
  "error": "unauthorized",
  "error_description": "Invalid token"
}
```

## 5. SSL/TLS und Zertifikats-Konfiguration

### CA-Zertifikat einbinden
```bash
# CA-Zertifikat für HTTPS-Verbindungen
curl --cacert /path/to/ca-certificate.pem \
  "https://keycloak.example.com/auth/realms/your_realm/protocol/openid-connect/token"

# Mehrere CA-Zertifikate
curl --cacert /path/to/ca-bundle.pem \
  "https://keycloak.example.com/auth/realms/your_realm/protocol/openid-connect/token"
```

### Client-Zertifikat-Authentifizierung
```bash
# Client-Zertifikat und privater Schlüssel
curl --cert /path/to/client-cert.pem \
  --key /path/to/client-key.pem \
  --cacert /path/to/ca-cert.pem \
  "https://keycloak.example.com/auth/realms/your_realm/protocol/openid-connect/token"
```

### Zertifikats-Verifizierung konfigurieren
```bash
# Zertifikat ignorieren (nur für Entwicklung!)
curl -k "https://keycloak.example.com/auth/realms/your_realm/protocol/openid-connect/token"

# Eigene CA-Zertifikate verwenden
curl --capath /path/to/ca-directory \
  "https://keycloak.example.com/auth/realms/your_realm/protocol/openid-connect/token"
```

## 6. Nützliche cURL-Optionen

- `-v`: Verbose Output für Debugging
- `-s`: Silent Mode (keine Progress-Bar)
- `-w`: Custom Output Format
- `-k`: SSL-Zertifikat ignorieren (nur für Entwicklung)
- `--cacert`: CA-Zertifikat-Datei
- `--cert`: Client-Zertifikat-Datei
- `--key`: Client-Schlüssel-Datei
- `--capath`: Verzeichnis mit CA-Zertifikaten

### Beispiel mit Debug-Informationen
```bash
curl -v -X POST \
  "http://localhost:8080/auth/realms/your_realm/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_username&password=your_password&grant_type=password&client_id=your_client_id"
```
