# Keycloak Integration mit Java/Spring Boot

Diese Dokumentation zeigt, wie Sie sich mit Keycloak über Java/Spring Boot verbinden und den zurückgelieferten Token für API-Aufrufe verwenden können.

## Voraussetzungen

- Java 17 oder höher
- Maven oder Gradle als Build-Tool
- Spring Boot 3.x
- Keycloak-Server läuft und ist erreichbar

## 1. Projekt Setup

### Maven (pom.xml)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.0</version>
        <relativePath/>
    </parent>

    <groupId>com.example</groupId>
    <artifactId>keycloak-integration</artifactId>
    <version>1.0.0</version>
    <name>keycloak-integration</name>
    <description>Keycloak Integration Beispiel</description>

    <properties>
        <java.version>17</java.version>
        <spring-cloud.version>2023.0.0</spring-cloud.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webflux</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.cloud</groupId>
                <artifactId>spring-cloud-dependencies</artifactId>
                <version>${spring-cloud.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

### Gradle (build.gradle)
```gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.2.0'
    id 'io.spring.dependency-management' version '1.1.4'
}

group = 'com.example'
version = '1.0.0'
sourceCompatibility = '17'

configurations {
    compileOnly {
        extendsFrom annotationProcessor
    }
}

repositories {
    mavenCentral()
}

ext {
    set('springCloudVersion', "2023.0.0")
}

dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-webflux'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    implementation 'org.springframework.cloud:spring-cloud-starter-openfeign'
    implementation 'com.fasterxml.jackson.core:jackson-databind'
    
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}

dependencyManagement {
    imports {
        mavenBom "org.springframework.cloud:spring-cloud-dependencies:${springCloudVersion}"
    }
}

tasks.named('test') {
    useJUnitPlatform()
}
```

## 2. Konfiguration

### application.yml
```yaml
server:
  port: 8080

spring:
  application:
    name: keycloak-integration

keycloak:
  auth-server-url: http://localhost:8080/auth
  realm: your_realm
  client-id: your_client_id
  username: your_username
  password: your_password
  ssl:
    ca-certificate-path: /path/to/ca-certificate.pem
    client-certificate-path: /path/to/client-certificate.pem
    client-key-path: /path/to/client-key.pem
    reject-unauthorized: true
    key-store-path: /path/to/keystore.jks
    key-store-password: your_keystore_password
    trust-store-path: /path/to/truststore.jks
    trust-store-password: your_truststore_password

api:
  base-url: https://api.example.com
  version: v1
  model: detailed

logging:
  level:
    com.example.keycloak: DEBUG
    org.springframework.web.client: DEBUG
```

### application.properties
```properties
# Server Configuration
server.port=8080
spring.application.name=keycloak-integration

# Keycloak Configuration
keycloak.auth-server-url=http://localhost:8080/auth
keycloak.realm=your_realm
keycloak.client-id=your_client_id
keycloak.username=your_username
keycloak.password=your_password

# API Configuration
api.base-url=https://api.example.com
api.version=v1
api.model=detailed

# Logging
logging.level.com.example.keycloak=DEBUG
logging.level.org.springframework.web.client=DEBUG
```

## 3. Model-Klassen

### KeycloakConfig.java
```java
package com.example.keycloak.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "keycloak")
public class KeycloakConfig {
    private String authServerUrl;
    private String realm;
    private String clientId;
    private String username;
    private String password;
    
    // SSL-Konfiguration (optional)
    private SslConfig ssl = new SslConfig();
    
    @Data
    public static class SslConfig {
        private String caCertificatePath;
        private String clientCertificatePath;
        private String clientKeyPath;
        private boolean rejectUnauthorized = true;
        private String keyStorePath;
        private String keyStorePassword;
        private String trustStorePath;
        private String trustStorePassword;
    }
}
```

### TokenResponse.java
```java
package com.example.keycloak.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class TokenResponse {
    @JsonProperty("access_token")
    private String accessToken;
    
    @JsonProperty("expires_in")
    private Integer expiresIn;
    
    @JsonProperty("refresh_expires_in")
    private Integer refreshExpiresIn;
    
    @JsonProperty("refresh_token")
    private String refreshToken;
    
    @JsonProperty("token_type")
    private String tokenType;
    
    @JsonProperty("id_token")
    private String idToken;
    
    @JsonProperty("not-before-policy")
    private Integer notBeforePolicy;
    
    @JsonProperty("session_state")
    private String sessionState;
    
    private String scope;
}
```

### CompletionRequest.java
```java
package com.example.keycloak.model;

import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class CompletionRequest {
    private List<Message> messages;
    private Integer maxTokens;
    private Double temperature;
    private Double topP;
    private Double frequencyPenalty;
    private Double presencePenalty;
    private Map<String, Object> additionalOptions;
    
    @Data
    public static class Message {
        private String role;
        private String content;
    }
}
```

### CompletionResponse.java
```java
package com.example.keycloak.model;

import lombok.Data;
import java.util.List;

@Data
public class CompletionResponse {
    private String id;
    private String object;
    private Long created;
    private String model;
    private List<Choice> choices;
    private Usage usage;
    
    @Data
    public static class Choice {
        private String text;
        private Integer index;
        private Object logprobs;
        private String finishReason;
    }
    
    @Data
    public static class Usage {
        private Integer promptTokens;
        private Integer completionTokens;
        private Integer totalTokens;
    }
}
```

### ApiResponse.java
```java
package com.example.keycloak.model;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApiResponse<T> {
    private T data;
    private String message;
    private String status;
}
```

## 4. Keycloak Client

### KeycloakClient.java
```java
package com.example.keycloak.client;

import com.example.keycloak.config.KeycloakConfig;
import com.example.keycloak.model.TokenResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class KeycloakClient {
    
    private final KeycloakConfig keycloakConfig;
    private final WebClient webClient;
    
    private String accessToken;
    private Instant tokenExpiry;
    
    public Mono<String> authenticate() {
        MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
        formData.add("username", keycloakConfig.getUsername());
        formData.add("password", keycloakConfig.getPassword());
        formData.add("grant_type", "password");
        formData.add("client_id", keycloakConfig.getClientId());
        
        String tokenUrl = String.format("%s/realms/%s/protocol/openid-connect/token",
                keycloakConfig.getAuthServerUrl(),
                keycloakConfig.getRealm());
        
        return webClient.post()
                .uri(tokenUrl)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(formData))
                .retrieve()
                .bodyToMono(TokenResponse.class)
                .doOnNext(this::updateTokenInfo)
                .doOnNext(response -> log.info("Erfolgreich authentifiziert"))
                .map(TokenResponse::getAccessToken)
                .doOnError(error -> log.error("Authentifizierungsfehler: {}", error.getMessage()));
    }
    
    private void updateTokenInfo(TokenResponse response) {
        this.accessToken = response.getAccessToken();
        this.tokenExpiry = Instant.now().plusSeconds(response.getExpiresIn());
    }
    
    public boolean isTokenValid() {
        return accessToken != null && 
               tokenExpiry != null && 
               Instant.now().isBefore(tokenExpiry);
    }
    
    public Mono<String> getValidToken() {
        if (isTokenValid()) {
            return Mono.just(accessToken);
        } else {
            return authenticate();
        }
    }
}
```

### ApiClient.java
```java
package com.example.keycloak.client;

import com.example.keycloak.model.CompletionRequest;
import com.example.keycloak.model.CompletionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Slf4j
@Component
@RequiredArgsConstructor
public class ApiClient {
    
    private final KeycloakClient keycloakClient;
    private final WebClient webClient;
    
    @Value("${api.base-url}")
    private String baseUrl;
    
    public Mono<CompletionResponse> getCompletions(CompletionRequest request, String version, String model) {
        String url = String.format("%s/%s/completions?api-version=2024-01-01&model=%s", baseUrl, version, model);
        
        return keycloakClient.getValidToken()
                .flatMap(token -> webClient.post()
                        .uri(url)
                        .header("Authorization", "Bearer " + token)
                        .bodyValue(request)
                        .retrieve()
                        .bodyToMono(CompletionResponse.class));
    }
}
```

## 5. Service Layer

### CompletionService.java
```java
package com.example.keycloak.service;

import com.example.keycloak.client.ApiClient;
import com.example.keycloak.model.CompletionRequest;
import com.example.keycloak.model.CompletionResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Slf4j
@Service
@RequiredArgsConstructor
public class CompletionService {
    
    private final ApiClient apiClient;
    
    public Mono<CompletionResponse> getCompletions(CompletionRequest request, String version, String model) {
        log.info("Completions API aufrufen - Version: {}, Modell: {}", version, model);
        return apiClient.getCompletions(request, version, model)
                .doOnNext(response -> log.info("Completions erfolgreich abgerufen: {}", response.getChoices().size()));
    }
}
```

## 6. Controller

### CompletionController.java
```java
package com.example.keycloak.controller;

import com.example.keycloak.model.CompletionRequest;
import com.example.keycloak.model.CompletionResponse;
import com.example.keycloak.service.CompletionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import jakarta.validation.Valid;

@Slf4j
@RestController
@RequestMapping("/api/completions")
@RequiredArgsConstructor
public class CompletionController {
    
    private final CompletionService completionService;
    
    @PostMapping
    public Mono<CompletionResponse> getCompletions(
            @Valid @RequestBody CompletionRequest request,
            @RequestParam(defaultValue = "v1") String version,
            @RequestParam(defaultValue = "gpt-4") String model) {
        
        log.info("POST /api/completions - Version: {}, Modell: {}", version, model);
        return completionService.getCompletions(request, version, model);
    }
}
```

## 7. Konfiguration

### WebClientConfig.java
```java
package com.example.keycloak.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;
import io.netty.handler.ssl.SslContext;
import io.netty.handler.ssl.SslContextBuilder;
import io.netty.handler.ssl.util.InsecureTrustManagerFactory;
import javax.net.ssl.SSLException;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

@Configuration
public class WebClientConfig {
    
    @Autowired
    private KeycloakConfig keycloakConfig;
    
    @Bean
    public WebClient webClient() throws SSLException {
        WebClient.Builder builder = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024));
        
        // SSL-Konfiguration (optional)
        if (keycloakConfig.getSsl() != null && keycloakConfig.getSsl().getCaCertificatePath() != null) {
            SslContext sslContext = createSslContext();
            builder = builder.codecs(configurer -> 
                configurer.defaultCodecs().maxInMemorySize(2 * 1024 * 1024));
        }
        
        return builder.build();
    }
    
    private SslContext createSslContext() throws SSLException {
        try {
            SslContextBuilder sslContextBuilder = SslContextBuilder.forClient();
            
            // CA-Zertifikat hinzufügen
            if (keycloakConfig.getSsl().getCaCertificatePath() != null) {
                CertificateFactory cf = CertificateFactory.getInstance("X.509");
                X509Certificate caCert = (X509Certificate) cf.generateCertificate(
                    new FileInputStream(keycloakConfig.getSsl().getCaCertificatePath()));
                sslContextBuilder.trustManager(caCert);
            }
            
            // Client-Zertifikat hinzufügen
            if (keycloakConfig.getSsl().getClientCertificatePath() != null && 
                keycloakConfig.getSsl().getClientKeyPath() != null) {
                // Hier würde die Client-Zertifikat-Logik implementiert
                // Vereinfachte Version für das Beispiel
            }
            
            return sslContextBuilder.build();
        } catch (Exception e) {
            throw new SSLException("Fehler beim Erstellen des SSL-Kontexts", e);
        }
    }
}
```

### MainApplication.java
```java
package com.example.keycloak;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class KeycloakIntegrationApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(KeycloakIntegrationApplication.class, args);
    }
}
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

## 10. Ausführung

```bash
# Maven
mvn spring-boot:run

# Gradle
./gradlew bootRun

# JAR-Datei erstellen und ausführen
mvn clean package
java -jar target/keycloak-integration-1.0.0.jar
```

## 11. API-Endpunkte testen

```bash
# Completions API aufrufen
curl -X POST "http://localhost:8080/api/completions?version=v1&model=gpt-4" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Erkläre mir die Grundlagen von Machine Learning"
      }
    ],
    "maxTokens": 100,
    "temperature": 0.7
  }'
```
