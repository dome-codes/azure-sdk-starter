# Keycloak Integration mit Python

Diese Dokumentation zeigt, wie Sie sich mit Keycloak über Python verbinden und den zurückgelieferten Token für API-Aufrufe verwenden können.

## Voraussetzungen

- Python 3.8 oder höher
- pip als Package Manager
- Keycloak-Server läuft und ist erreichbar

## 1. Projekt Setup

### requirements.txt
```txt
requests==2.31.0
httpx==0.25.0
pydantic==2.5.0
python-dotenv==1.0.0
aiohttp==3.9.0
asyncio-mqtt==0.16.1
```


### .env
```env
# Keycloak Configuration
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080/auth
KEYCLOAK_REALM=your_realm
KEYCLOAK_CLIENT_ID=your_client_id
KEYCLOAK_USERNAME=your_username
KEYCLOAK_PASSWORD=your_password

# SSL Configuration (optional)
KEYCLOAK_SSL_CA_CERT_PATH=/path/to/ca-certificate.pem
KEYCLOAK_SSL_CLIENT_CERT_PATH=/path/to/client-certificate.pem
KEYCLOAK_SSL_CLIENT_KEY_PATH=/path/to/client-key.pem
KEYCLOAK_SSL_VERIFY=true

# API Configuration
API_BASE_URL=https://api.example.com
API_VERSION=v1
API_MODEL=detailed
```

### pyproject.toml
```toml
[tool.poetry]
name = "keycloak-integration"
version = "1.0.0"
description = "Keycloak Integration Beispiel"
authors = ["Your Name <your.email@example.com>"]

[tool.poetry.dependencies]
python = "^3.8"
requests = "^2.31.0"
httpx = "^0.25.0"
pydantic = "^2.5.0"
python-dotenv = "^1.0.0"
aiohttp = "^3.9.0"

[tool.poetry.dev-dependencies]
pytest = "^7.4.0"
black = "^23.0.0"
flake8 = "^6.0.0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
```

## 2. Model-Klassen

### models.py
```python
from datetime import datetime
from typing import Optional, List, Generic, TypeVar
from pydantic import BaseModel, Field

T = TypeVar('T')

class KeycloakConfig(BaseModel):
    auth_server_url: str = Field(..., alias="authServerUrl")
    realm: str
    client_id: str = Field(..., alias="clientId")
    username: str
    password: str
    ssl: Optional[Dict[str, any]] = Field(None, alias="ssl")

class TokenResponse(BaseModel):
    access_token: str = Field(..., alias="accessToken")
    expires_in: int = Field(..., alias="expiresIn")
    refresh_expires_in: int = Field(..., alias="refreshExpiresIn")
    refresh_token: str = Field(..., alias="refreshToken")
    token_type: str = Field(..., alias="tokenType")
    id_token: str = Field(..., alias="idToken")
    not_before_policy: int = Field(..., alias="notBeforePolicy")
    session_state: str = Field(..., alias="sessionState")
    scope: str

class CompletionRequest(BaseModel):
    messages: List[Dict[str, str]]
    max_tokens: int
    temperature: float
    top_p: Optional[float] = None
    frequency_penalty: Optional[float] = None
    presence_penalty: Optional[float] = None

class CompletionResponse(BaseModel):
    id: str
    object: str
    created: int
    model: str
    choices: List[Dict[str, any]]
    usage: Dict[str, int]
```

## 3. Keycloak Client

### keycloak_client.py
```python
import time
import logging
from typing import Optional
from datetime import datetime, timedelta
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from models import KeycloakConfig, TokenResponse

logger = logging.getLogger(__name__)

class KeycloakClient:
    def __init__(self, config: KeycloakConfig):
        self.config = config
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
        # Session mit Retry-Strategie konfigurieren
        self.session = requests.Session()
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # SSL-Konfiguration (optional)
        if config.ssl:
            self._configure_ssl()
    
    def _configure_ssl(self):
        """SSL-Konfiguration für die Session einrichten"""
        try:
            ssl_config = self.config.ssl
            
            # CA-Zertifikat
            if ssl_config.get('ca_cert_path'):
                self.session.verify = ssl_config['ca_cert_path']
            
            # Client-Zertifikat
            if ssl_config.get('client_cert_path') and ssl_config.get('client_key_path'):
                self.session.cert = (ssl_config['client_cert_path'], ssl_config['client_key_path'])
            
            # SSL-Verifizierung konfigurieren
            if 'verify' in ssl_config:
                self.session.verify = ssl_config['verify']
                
        except Exception as e:
            logger.warning(f"SSL-Konfiguration fehlgeschlagen: {e}")
            # Fallback: SSL-Verifizierung deaktivieren
            self.session.verify = False
    
    def authenticate(self) -> str:
        """Authentifizierung bei Keycloak durchführen"""
        try:
            # Form-Daten für Token-Request
            data = {
                'username': self.config.username,
                'password': self.config.password,
                'grant_type': 'password',
                'client_id': self.config.client_id
            }
            
            # Token-URL zusammenbauen
            token_url = f"{self.config.auth_server_url}/realms/{self.config.realm}/protocol/openid-connect/token"
            
            # Request senden
            response = self.session.post(
                token_url,
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=30
            )
            response.raise_for_status()
            
            # Response parsen
            token_data = TokenResponse(**response.json())
            
            # Token-Informationen speichern
            self.access_token = token_data.access_token
            self.token_expiry = datetime.now() + timedelta(seconds=token_data.expires_in)
            
            logger.info("Erfolgreich authentifiziert")
            return self.access_token
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Authentifizierungsfehler: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler bei der Authentifizierung: {e}")
            raise
    
    def is_token_valid(self) -> bool:
        """Prüfen ob der aktuelle Token noch gültig ist"""
        if not self.access_token or not self.token_expiry:
            return False
        
        # 30 Sekunden Puffer vor Ablauf
        return datetime.now() < (self.token_expiry - timedelta(seconds=30))
    
    def get_valid_token(self) -> str:
        """Gültigen Token zurückgeben oder neuen anfordern"""
        if not self.is_token_valid():
            self.authenticate()
        
        return self.access_token
    
    def make_api_call(self, url: str, method: str = 'GET', **kwargs) -> dict:
        """API-Aufruf mit gültigem Token durchführen"""
        token = self.get_valid_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            **kwargs.get('headers', {})
        }
        
        try:
            response = self.session.request(
                method=method,
                url=url,
                headers=headers,
                timeout=30,
                **{k: v for k, v in kwargs.items() if k != 'headers'}
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            logger.error(f"API-Aufruf fehlgeschlagen: {e}")
            if hasattr(e, 'response') and e.response is not None:
                logger.error(f"Response: {e.response.text}")
            raise
```

## 4. API Client

### api_client.py
```python
import logging
from typing import List, Optional
from keycloak_client import KeycloakClient
from models import User, Product, ApiResponse

logger = logging.getLogger(__name__)

class ApiClient:
    def __init__(self, keycloak_client: KeycloakClient, base_url: str):
        self.keycloak_client = keycloak_client
        self.base_url = base_url.rstrip('/')
    
    def get_completions(self, messages: List[Dict[str, str]], version: str = 'v1', model: str = 'gpt-4', options: dict = None) -> CompletionResponse:
        """Completions API aufrufen"""
        if options is None:
            options = {}
            
        url = f"{self.base_url}/{version}/completions?api-version=2024-01-01&model={model}"
        
        request_body = {
            'messages': messages,
            'max_tokens': options.get('max_tokens', 100),
            'temperature': options.get('temperature', 0.7),
            **options
        }
        
        try:
            response_data = self.keycloak_client.make_api_call(url, method='POST', json=request_body)
            return CompletionResponse(**response_data)
        except Exception as e:
            logger.error(f"Fehler beim Aufrufen der Completions API: {e}")
            raise
```

## 5. Asynchrone Version

### async_keycloak_client.py
```python
import time
import logging
from typing import Optional
from datetime import datetime, timedelta
import aiohttp
import asyncio

from models import KeycloakConfig, TokenResponse

logger = logging.getLogger(__name__)

class AsyncKeycloakClient:
    def __init__(self, config: KeycloakConfig):
        self.config = config
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def authenticate(self) -> str:
        """Asynchrone Authentifizierung bei Keycloak"""
        try:
            # Form-Daten für Token-Request
            data = aiohttp.FormData()
            data.add_field('username', self.config.username)
            data.add_field('password', self.config.password)
            data.add_field('grant_type', 'password')
            data.add_field('client_id', self.config.client_id)
            
            # Token-URL zusammenbauen
            token_url = f"{self.config.auth_server_url}/realms/{self.config.realm}/protocol/openid-connect/token"
            
            # Request senden
            async with self.session.post(
                token_url,
                data=data,
                headers={'Content-Type': 'application/x-www-form-urlencoded'},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                response.raise_for_status()
                response_data = await response.json()
            
            # Response parsen
            token_data = TokenResponse(**response_data)
            
            # Token-Informationen speichern
            self.access_token = token_data.access_token
            self.token_expiry = datetime.now() + timedelta(seconds=token_data.expires_in)
            
            logger.info("Erfolgreich authentifiziert")
            return self.access_token
            
        except aiohttp.ClientError as e:
            logger.error(f"Authentifizierungsfehler: {e}")
            raise
        except Exception as e:
            logger.error(f"Unerwarteter Fehler bei der Authentifizierung: {e}")
            raise
    
    def is_token_valid(self) -> bool:
        """Prüfen ob der aktuelle Token noch gültig ist"""
        if not self.access_token or not self.token_expiry:
            return False
        
        # 30 Sekunden Puffer vor Ablauf
        return datetime.now() < (self.token_expiry - timedelta(seconds=30))
    
    async def get_valid_token(self) -> str:
        """Gültigen Token zurückgeben oder neuen anfordern"""
        if not self.is_token_valid():
            await self.authenticate()
        
        return self.access_token
    
    async def make_api_call(self, url: str, method: str = 'GET', **kwargs) -> dict:
        """Asynchroner API-Aufruf mit gültigem Token"""
        token = await self.get_valid_token()
        
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json',
            **kwargs.get('headers', {})
        }
        
        try:
            async with self.session.request(
                method=method,
                url=url,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=30),
                **{k: v for k, v in kwargs.items() if k != 'headers'}
            ) as response:
                response.raise_for_status()
                return await response.json()
                
        except aiohttp.ClientError as e:
            logger.error(f"API-Aufruf fehlgeschlagen: {e}")
            raise
```

### async_api_client.py
```python
import logging
from typing import List
from async_keycloak_client import AsyncKeycloakClient
from models import User, Product, ApiResponse

logger = logging.getLogger(__name__)

class AsyncApiClient:
    def __init__(self, keycloak_client: AsyncKeycloakClient, base_url: str):
        self.keycloak_client = keycloak_client
        self.base_url = base_url.rstrip('/')
    
    async def get_users(self, version: str = 'v1', model: str = 'detailed') -> ApiResponse[List[User]]:
        """Benutzer asynchron abrufen"""
        url = f"{self.base_url}/{version}/users?model={model}"
        
        try:
            response_data = await self.keycloak_client.make_api_call(url, method='GET')
            return ApiResponse(**response_data)
        except Exception as e:
            logger.error(f"Fehler beim Abrufen der Benutzer: {e}")
            raise
    
    async def create_product(self, product_data: Product, version: str = 'v2', model: str = 'full') -> ApiResponse[Product]:
        """Produkt asynchron erstellen"""
        url = f"{self.base_url}/{version}/products?model={model}"
        
        try:
            response_data = await self.keycloak_client.make_api_call(
                url, 
                method='POST', 
                json=product_data.dict(exclude={'id', 'created_at', 'updated_at'})
            )
            return ApiResponse(**response_data)
        except Exception as e:
            logger.error(f"Fehler beim Erstellen des Produkts: {e}")
            raise
    
    async def update_product(self, product_id: str, product_data: Product, version: str = 'v2', model: str = 'full') -> ApiResponse[Product]:
        """Produkt asynchron aktualisieren"""
        url = f"{self.base_url}/{version}/products/{product_id}?model={model}"
        
        try:
            response_data = await self.keycloak_client.make_api_call(
                url, 
                method='PUT', 
                json=product_data.dict(exclude={'id', 'created_at', 'updated_at'})
            )
            return ApiResponse(**response_data)
        except Exception as e:
            logger.error(f"Fehler beim Aktualisieren des Produkts: {e}")
            raise
    
    async def delete_product(self, product_id: str, version: str = 'v2') -> ApiResponse[None]:
        """Produkt asynchron löschen"""
        url = f"{self.base_url}/{version}/products/{product_id}"
        
        try:
            response_data = await self.keycloak_client.make_api_call(url, method='DELETE')
            return ApiResponse(**response_data)
        except Exception as e:
            logger.error(f"Fehler beim Löschen des Produkts: {e}")
            raise
```

## 6. Konfiguration

### config.py
```python
import os
from typing import Optional
from dotenv import load_dotenv
from models import KeycloakConfig

# .env-Datei laden
load_dotenv()

def get_keycloak_config() -> KeycloakConfig:
    """Keycloak-Konfiguration aus Umgebungsvariablen laden"""
    ssl_config = None
    
    # SSL-Konfiguration prüfen
    if os.getenv('KEYCLOAK_SSL_CA_CERT_PATH'):
        ssl_config = {
            'ca_cert_path': os.getenv('KEYCLOAK_SSL_CA_CERT_PATH'),
            'client_cert_path': os.getenv('KEYCLOAK_SSL_CLIENT_CERT_PATH'),
            'client_key_path': os.getenv('KEYCLOAK_SSL_CLIENT_KEY_PATH'),
            'verify': os.getenv('KEYCLOAK_SSL_VERIFY', 'true').lower() == 'true'
        }
    
    return KeycloakConfig(
        auth_server_url=os.getenv('KEYCLOAK_AUTH_SERVER_URL', 'http://localhost:8080/auth'),
        realm=os.getenv('KEYCLOAK_REALM', 'your_realm'),
        client_id=os.getenv('KEYCLOAK_CLIENT_ID', 'your_client_id'),
        username=os.getenv('KEYCLOAK_USERNAME', 'your_username'),
        password=os.getenv('KEYCLOAK_PASSWORD', 'your_password'),
        ssl=ssl_config
    )

def get_api_config() -> dict:
    """API-Konfiguration aus Umgebungsvariablen laden"""
    return {
        'base_url': os.getenv('API_BASE_URL', 'https://api.example.com'),
        'version': os.getenv('API_VERSION', 'v1'),
        'model': os.getenv('API_MODEL', 'detailed')
    }
```

## 7. Hauptanwendung

### main.py
```python
import asyncio
import logging
from config import get_keycloak_config, get_api_config
from keycloak_client import KeycloakClient
from api_client import ApiClient
from models import Product

# Logging konfigurieren
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

def main_sync():
    """Synchrone Hauptfunktion"""
    try:
        # Konfiguration laden
        keycloak_config = get_keycloak_config()
        api_config = get_api_config()
        
        # Keycloak-Client initialisieren
        keycloak_client = KeycloakClient(keycloak_config)
        
        # API-Client initialisieren
        api_client = ApiClient(keycloak_client, api_config['base_url'])
        
        # Beispiel: Completions API aufrufen
        print("Completions API aufrufen...")
        messages = [
            {
                "role": "user",
                "content": "Erkläre mir die Grundlagen von Machine Learning"
            }
        ]
        
        completion_response = api_client.get_completions(
            messages, 
            'v1', 
            'gpt-4',
            {
                'max_tokens': 100,
                'temperature': 0.7
            }
        )
        print(f"Completions erfolgreich abgerufen: {completion_response.choices[0]['text']}")
        
    except Exception as e:
        logging.error(f"Fehler in der Hauptfunktion: {e}")
        raise

async def main_async():
    """Asynchrone Hauptfunktion"""
    try:
        # Konfiguration laden
        keycloak_config = get_keycloak_config()
        api_config = get_api_config()
        
        # Asynchrone Clients initialisieren
        async with AsyncKeycloakClient(keycloak_config) as keycloak_client:
            api_client = AsyncApiClient(keycloak_client, api_config['base_url'])
            
            # Beispiel: Benutzer abrufen
            print("Benutzer abrufen (async)...")
            users_response = await api_client.get_users(api_config['version'], api_config['model'])
            print(f"Benutzer erfolgreich abgerufen: {len(users_response.data)}")
            
            # Beispiel: Produkt erstellen
            print("Produkt erstellen (async)...")
            new_product = Product(
                name="Neues Produkt Async",
                description="Produktbeschreibung Async",
                price=149.99,
                category="electronics"
            )
            
            created_product_response = await api_client.create_product(new_product, 'v2', 'full')
            print(f"Produkt erfolgreich erstellt: {created_product_response.data.name}")
            
    except Exception as e:
        logging.error(f"Fehler in der asynchronen Hauptfunktion: {e}")
        raise

if __name__ == "__main__":
    print("=== Synchrone Ausführung ===")
    main_sync()
    
    print("\n=== Asynchrone Ausführung ===")
    asyncio.run(main_async())
```

## 8. Beispiel Response

### Erfolgreiche Authentifizierung
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

### API Response - Benutzer
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "username": "john.doe",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "enabled": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "message": "Benutzer erfolgreich abgerufen",
  "status": "success"
}
```

### API Response - Produkt
```json
{
  "data": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "Neues Produkt",
    "description": "Produktbeschreibung",
    "price": 99.99,
    "category": "electronics",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Produkt erfolgreich erstellt",
  "status": "success"
}
```

## 9. Fehlerbehandlung

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

## 10. SSL/TLS und Zertifikats-Konfiguration

### CA-Zertifikat einbinden
```python
# Über Umgebungsvariablen
export KEYCLOAK_SSL_CA_CERT_PATH=/path/to/ca-certificate.pem
export KEYCLOAK_SSL_VERIFY=true

# Oder direkt im Code
keycloak_config = KeycloakConfig(
    auth_server_url="https://keycloak.example.com/auth",
    realm="your_realm",
    client_id="your_client_id",
    username="your_username",
    password="your_password",
    ssl={
        'ca_cert_path': '/path/to/ca-certificate.pem',
        'verify': True
    }
)
```

### Client-Zertifikat-Authentifizierung
```python
keycloak_config = KeycloakConfig(
    auth_server_url="https://keycloak.example.com/auth",
    realm="your_realm",
    client_id="your_client_id",
    username="your_username",
    password="your_password",
    ssl={
        'ca_cert_path': '/path/to/ca-certificate.pem',
        'client_cert_path': '/path/to/client-certificate.pem',
        'client_key_path': '/path/to/client-key.pem',
        'verify': True
    }
)
```

### SSL-Verifizierung deaktivieren (nur für Entwicklung!)
```python
keycloak_config = KeycloakConfig(
    auth_server_url="https://keycloak.example.com/auth",
    realm="your_realm",
    client_id="your_client_id",
    username="your_username",
    password="your_password",
    ssl={
        'verify': False
    }
)
```

## 11. Installation und Ausführung

```bash
# Dependencies installieren
pip install -r requirements.txt

# Oder mit Poetry
poetry install

# Synchrone Version ausführen
python main.py

# Nur synchrone Version
python -c "from main import main_sync; main_sync()"

# Nur asynchrone Version
python -c "import asyncio; from main import main_async; asyncio.run(main_async())"
```

## 12. Tests

### test_keycloak_client.py
```python
import pytest
from unittest.mock import Mock, patch
from keycloak_client import KeycloakClient
from models import KeycloakConfig

@pytest.fixture
def keycloak_config():
    return KeycloakConfig(
        auth_server_url="http://localhost:8080/auth",
        realm="test_realm",
        client_id="test_client",
        username="test_user",
        password="test_password"
    )

@pytest.fixture
def keycloak_client(keycloak_config):
    return KeycloakClient(keycloak_config)

def test_keycloak_client_initialization(keycloak_client):
    assert keycloak_client.access_token is None
    assert keycloak_client.token_expiry is None

@patch('requests.Session.post')
def test_authenticate_success(mock_post, keycloak_client):
    # Mock-Response
    mock_response = Mock()
    mock_response.json.return_value = {
        "access_token": "test_token",
        "expires_in": 300,
        "refresh_expires_in": 1800,
        "refresh_token": "refresh_token",
        "token_type": "Bearer",
        "id_token": "id_token",
        "not_before_policy": 0,
        "session_state": "session_state",
        "scope": "openid email profile"
    }
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response
    
    # Test
    token = keycloak_client.authenticate()
    
    assert token == "test_token"
    assert keycloak_client.access_token == "test_token"
    assert keycloak_client.token_expiry is not None
```

## 13. CLI-Tool

### cli.py
```python
import click
import asyncio
from config import get_keycloak_config, get_api_config
from keycloak_client import KeycloakClient
from api_client import ApiClient
from models import Product

@click.group()
def cli():
    """Keycloak Integration CLI Tool"""
    pass

@cli.command()
@click.option('--version', default='v1', help='API Version')
@click.option('--model', default='detailed', help='API Model')
def get_users(version, model):
    """Benutzer abrufen"""
    try:
        keycloak_config = get_keycloak_config()
        api_config = get_api_config()
        
        keycloak_client = KeycloakClient(keycloak_config)
        api_client = ApiClient(keycloak_client, api_config['base_url'])
        
        users_response = api_client.get_users(version, model)
        click.echo(f"Benutzer erfolgreich abgerufen: {len(users_response.data)}")
        
        for user in users_response.data:
            click.echo(f"- {user.username} ({user.email})")
            
    except Exception as e:
        click.echo(f"Fehler: {e}", err=True)

@cli.command()
@click.option('--name', required=True, help='Produktname')
@click.option('--description', required=True, help='Produktbeschreibung')
@click.option('--price', required=True, type=float, help='Preis')
@click.option('--category', required=True, help='Kategorie')
@click.option('--version', default='v2', help='API Version')
@click.option('--model', default='full', help='API Model')
def create_product(name, description, price, category, version, model):
    """Produkt erstellen"""
    try:
        keycloak_config = get_keycloak_config()
        api_config = get_api_config()
        
        keycloak_client = KeycloakClient(keycloak_config)
        api_client = ApiClient(keycloak_client, api_config['base_url'])
        
        new_product = Product(
            name=name,
            description=description,
            price=price,
            category=category
        )
        
        created_product_response = api_client.create_product(new_product, version, model)
        click.echo(f"Produkt erfolgreich erstellt: {created_product_response.data.name}")
        
    except Exception as e:
        click.echo(f"Fehler: {e}", err=True)

if __name__ == '__main__':
    cli()
```

## 14. Verwendung des CLI-Tools

```bash
# Benutzer abrufen
python cli.py get-users --version v1 --model detailed

# Produkt erstellen
python cli.py create-product \
  --name "Neues Produkt" \
  --description "Produktbeschreibung" \
  --price 99.99 \
  --category "electronics" \
  --version v2 \
  --model full

# Hilfe anzeigen
python cli.py --help
python cli.py get-users --help
python cli.py create-product --help
```
