# Keycloak Integration mit JavaScript/TypeScript

Diese Dokumentation zeigt, wie Sie sich mit Keycloak über JavaScript/TypeScript verbinden und den zurückgelieferten Token für API-Aufrufe verwenden können.

## Voraussetzungen

- Node.js installiert
- npm oder yarn als Package Manager
- Keycloak-Server läuft und ist erreichbar

## 1. Projekt Setup

### package.json
```json
{
  "name": "keycloak-integration",
  "version": "1.0.0",
  "description": "Keycloak Integration Beispiel",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "test": "jest"
  },
  "dependencies": {
    "axios": "^1.6.0",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 2. JavaScript Implementation

### keycloak-client.js
```javascript
const axios = require('axios');
const FormData = require('form-data');

class KeycloakClient {
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.realm = config.realm;
        this.clientId = config.clientId;
        this.username = config.username;
        this.password = config.password;
        this.accessToken = null;
        this.tokenExpiry = null;
    }

    async authenticate() {
        try {
            const formData = new FormData();
            formData.append('username', this.username);
            formData.append('password', this.password);
            formData.append('grant_type', 'password');
            formData.append('client_id', this.clientId);

            const response = await axios.post(
                `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('Erfolgreich authentifiziert');
            return this.accessToken;
        } catch (error) {
            console.error('Authentifizierungsfehler:', error.response?.data || error.message);
            throw error;
        }
    }

    isTokenValid() {
        return this.accessToken && Date.now() < this.tokenExpiry;
    }

    async getValidToken() {
        if (!this.isTokenValid()) {
            await this.authenticate();
        }
        return this.accessToken;
    }

    async makeApiCall(url, options = {}) {
        const token = await this.getValidToken();
        
        const config = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response = await axios(url, config);
            return response.data;
        } catch (error) {
            console.error('API-Aufruf fehlgeschlagen:', error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = KeycloakClient;
```

### api-client.js
```javascript
const KeycloakClient = require('./keycloak-client');

class ApiClient {
    constructor(keycloakClient) {
        this.keycloakClient = keycloakClient;
        this.baseUrl = 'https://api.example.com';
    }

    async getCompletions(messages, apiVersion = '2024-12-01', model = 'gpt-4o', options = {}) {
        const url = `${this.baseUrl}/v1/completions?api-version=${apiVersion}&model=${model}`;
        const requestBody = {
            messages: messages,
            max_tokens: options.maxTokens || 100,
            temperature: options.temperature || 0.7,
            ...options
        };
        
        return await this.keycloakClient.makeApiCall(url, {
            method: 'POST',
            data: requestBody
        });
    }
}

module.exports = ApiClient;
```

### index.js
```javascript
const KeycloakClient = require('./keycloak-client');
const ApiClient = require('./api-client');

async function main() {
    // Keycloak-Konfiguration
    const keycloakConfig = {
        baseUrl: 'http://localhost:8080/auth',
        realm: 'your_realm',
        clientId: 'public',
        username: 'your_username',
        password: 'your_password',
        // SSL-Konfiguration (optional)
        ssl: {
            ca: '/path/to/ca-certificate.pem',
            cert: '/path/to/client-certificate.pem',
            key: '/path/to/client-key.pem',
            rejectUnauthorized: true
        }
    };

    try {
        // Keycloak-Client initialisieren
        const keycloakClient = new KeycloakClient(keycloakConfig);
        
        // API-Client initialisieren
        const apiClient = new ApiClient(keycloakClient);

        // Beispiel: Completions API aufrufen
        console.log('Completions API aufrufen...');
        const completionResponse = await apiClient.getCompletions(
            [
                {
                    role: 'user',
                    content: 'Erkläre mir die Grundlagen von Machine Learning'
                }
            ],
            '2024-12-01',
            'gpt-4o',
            {
                maxTokens: 100,
                temperature: 0.7
            }
        );
        console.log('Completions Response:', completionResponse);

    } catch (error) {
        console.error('Fehler in der Hauptfunktion:', error);
    }
}

// Skript ausführen
if (require.main === module) {
    main();
}

module.exports = { main };
```

## 3. TypeScript Implementation

### types.ts
```typescript
export interface KeycloakConfig {
    baseUrl: string;
    realm: string;
    clientId: string;
    username: string;
    password: string;
    ssl?: {
        ca?: string;
        cert?: string;
        key?: string;
        rejectUnauthorized?: boolean;
    };
}

export interface TokenResponse {
    access_token: string;
    expires_in: number;
    refresh_expires_in: number;
    refresh_token: string;
    token_type: string;
    id_token: string;
    not_before_policy: number;
    session_state: string;
    scope: string;
}

export interface CompletionRequest {
    messages: Array<{
        role: string;
        content: string;
    }>;
    max_tokens: number;
    temperature: number;
    top_p?: number;
    frequency_penalty?: number;
    presence_penalty?: number;
}

export interface CompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        text: string;
        index: number;
        logprobs: any;
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface ApiResponse<T> {
    data: T;
    message?: string;
    status: string;
}
```

### keycloak-client.ts
```typescript
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import FormData from 'form-data';
import { KeycloakConfig, TokenResponse } from './types';

export class KeycloakClient {
    private baseUrl: string;
    private realm: string;
    private clientId: string;
    private username: string;
    private password: string;
    private accessToken: string | null = null;
    private tokenExpiry: number | null = null;

    constructor(config: KeycloakConfig) {
        this.baseUrl = config.baseUrl;
        this.realm = config.realm;
        this.clientId = config.clientId;
        this.username = config.username;
        this.password = config.password;
    }

    async authenticate(): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('username', this.username);
            formData.append('password', this.password);
            formData.append('grant_type', 'password');
            formData.append('client_id', this.clientId);

            const response: AxiosResponse<TokenResponse> = await axios.post(
                `${this.baseUrl}/realms/${this.realm}/protocol/openid-connect/token`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                }
            );

            this.accessToken = response.data.access_token;
            this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);

            console.log('Erfolgreich authentifiziert');
            return this.accessToken;
        } catch (error: any) {
            console.error('Authentifizierungsfehler:', error.response?.data || error.message);
            throw error;
        }
    }

    isTokenValid(): boolean {
        return this.accessToken !== null && this.tokenExpiry !== null && Date.now() < this.tokenExpiry;
    }

    async getValidToken(): Promise<string> {
        if (!this.isTokenValid()) {
            await this.authenticate();
        }
        return this.accessToken!;
    }

    async makeApiCall<T>(url: string, options: AxiosRequestConfig = {}): Promise<T> {
        const token = await this.getValidToken();
        
        const config: AxiosRequestConfig = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        try {
            const response: AxiosResponse<T> = await axios(url, config);
            return response.data;
        } catch (error: any) {
            console.error('API-Aufruf fehlgeschlagen:', error.response?.data || error.message);
            throw error;
        }
    }
}
```

### api-client.ts
```typescript
import { KeycloakClient } from './keycloak-client';
import { CompletionRequest, CompletionResponse } from './types';

export class ApiClient {
    private keycloakClient: KeycloakClient;
    private baseUrl: string;

    constructor(keycloakClient: KeycloakClient) {
        this.keycloakClient = keycloakClient;
        this.baseUrl = 'https://api.example.com';
    }

    async getCompletions(
        messages: Array<{role: string; content: string}>, 
        apiVersion: string = '2024-12-01', 
        model: string = 'gpt-4o', 
        options: Partial<CompletionRequest> = {}
    ): Promise<CompletionResponse> {
        const url = `${this.baseUrl}/v1/completions?api-version=${apiVersion}&model=${model}`;
        
        const requestBody: CompletionRequest = {
            messages,
            max_tokens: options.max_tokens || 100,
            temperature: options.temperature || 0.7,
            ...options
        };
        
        return this.keycloakClient.makeApiCall<CompletionResponse>(url, {
            method: 'POST',
            data: requestBody
        });
    }
}
```

### index.ts
```typescript
import { KeycloakClient } from './keycloak-client';
import { ApiClient } from './api-client';
import { KeycloakConfig } from './types';

async function main(): Promise<void> {
    // Keycloak-Konfiguration
    const keycloakConfig: KeycloakConfig = {
        baseUrl: 'http://localhost:8080/auth',
        realm: 'your_realm',
        clientId: 'public',
        username: 'your_username',
        password: 'your_password',
        // SSL-Konfiguration (optional)
        ssl: {
            ca: '/path/to/ca-certificate.pem',
            cert: '/path/to/client-certificate.pem',
            key: '/path/to/client-key.pem',
            rejectUnauthorized: true
        }
    };

    try {
        // Keycloak-Client initialisieren
        const keycloakClient = new KeycloakClient(keycloakConfig);
        
        // API-Client initialisieren
        const apiClient = new ApiClient(keycloakClient);

        // Beispiel: Completions API aufrufen
        console.log('Completions API aufrufen...');
        const completionResponse = await apiClient.getCompletions(
            [
                {
                    role: 'user',
                    content: 'Erkläre mir die Grundlagen von Machine Learning'
                }
            ],
            '2024-12-01',
            'gpt-4o',
            {
                max_tokens: 100,
                temperature: 0.7
            }
        );
        console.log('Completions Response:', completionResponse);

    } catch (error: any) {
        console.error('Fehler in der Hauptfunktion:', error);
    }
}

// Skript ausführen
if (require.main === module) {
    main();
}

export { main };
```

## 4. Beispiel Response

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

### API Response - Completions
```json
{
  "id": "cmpl-1234567890abcdef",
  "object": "text_completion",
  "created": 1640995200,
  "model": "gpt-4",
  "choices": [
    {
      "text": "Machine Learning ist ein Teilbereich der künstlichen Intelligenz, der es Computern ermöglicht, aus Daten zu lernen und Vorhersagen zu treffen, ohne explizit programmiert zu werden.",
      "index": 0,
      "logprobs": null,
      "finish_reason": "length"
    }
  ],
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 35,
    "total_tokens": 50
  }
}
```



## 5. Installation und Ausführung

```bash
# Dependencies installieren
npm install

# JavaScript-Version ausführen
npm start

# TypeScript-Version ausführen
npm run dev

# TypeScript kompilieren
npm run build
```

## 6. Fehlerbehandlung

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
