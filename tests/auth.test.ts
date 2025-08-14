import { AuthConfig, AuthManager, TokenResponse } from '../src/auth';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn()
  }))
}));

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockPost: jest.Mock;
  const mockConfig: AuthConfig = {
    username: 'testuser',
    password: 'testpass',
    authUrl: 'https://test-auth.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPost = jest.fn();
    
    const axios = require('axios');
    axios.create.mockReturnValue({ post: mockPost });
    
    authManager = new AuthManager(mockConfig);
  });

  describe('Constructor', () => {
    it('should create AuthManager with config', () => {
      expect(authManager).toBeInstanceOf(AuthManager);
    });

    it('should use default authUrl if not provided', () => {
      const config: AuthConfig = {
        username: 'user',
        password: 'pass'
      };
      const manager = new AuthManager(config);
      expect(manager).toBeInstanceOf(AuthManager);
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully', async () => {
      const mockResponse: TokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };

      mockPost.mockResolvedValue({ data: mockResponse });

      const token = await authManager.authenticate();

      expect(mockPost).toHaveBeenCalledWith('/oauth2/v2.0/token', expect.any(URLSearchParams));
      expect(token).toBe('test-access-token');
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Invalid credentials');
      mockPost.mockRejectedValue(error);

      await expect(authManager.authenticate())
        .rejects
        .toThrow('Authentication failed: Invalid credentials');
    });
  });

  describe('getValidToken', () => {
    it('should return existing valid token', async () => {
      // Erst authentifizieren
      const mockResponse: TokenResponse = {
        access_token: 'test-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };
      mockPost.mockResolvedValue({ data: mockResponse });

      await authManager.authenticate();
      
      // Token sollte noch gültig sein
      const token = await authManager.getValidToken();
      expect(token).toBe('test-token');
    });

    it('should refresh expired token', async () => {
      // Erst authentifizieren mit kurzer Gültigkeit
      const mockResponse: TokenResponse = {
        access_token: 'old-token',
        refresh_token: 'refresh-token',
        expires_in: 1, // 1 Sekunde
        token_type: 'Bearer'
      };
      mockPost.mockResolvedValue({ data: mockResponse });

      await authManager.authenticate();
      
      // Warten bis Token abgelaufen ist
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Neuer Token sollte geholt werden
      const newMockResponse: TokenResponse = {
        access_token: 'new-token',
        expires_in: 3600,
        token_type: 'Bearer'
      };
      mockPost.mockResolvedValue({ data: newMockResponse });
      
      const token = await authManager.getValidToken();
      expect(token).toBe('new-token');
    });
  });

  describe('Token Status', () => {
    it('should return token status', () => {
      const status = authManager.getTokenStatus();
      expect(status.hasToken).toBe(false);
      expect(status.expiresAt).toBeNull();
      expect(status.isExpiringSoon).toBe(true);
    });

    it('should check if token is expiring soon', () => {
      expect(authManager.isTokenExpiringSoon()).toBe(true);
    });
  });

  describe('Token Management', () => {
    it('should clear tokens', () => {
      authManager.clearTokens();
      const status = authManager.getTokenStatus();
      expect(status.hasToken).toBe(false);
    });

    it('should get current token', () => {
      const token = authManager.getCurrentToken();
      expect(token).toBeNull();
    });
  });
});
