// Test-Setup für Jest

// Globale Test-Konfiguration
beforeAll(() => {
  // Setup für globale Tests
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  // Nach jedem Test aufräumen
  jest.clearAllMocks();
});

afterAll(() => {
  // Nach allen Tests aufräumen
  process.env.NODE_ENV = 'development';
});

// Globale Test-Timeout erhöhen für API-Calls
jest.setTimeout(10000);

// Console-Warnungen in Tests unterdrücken
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
}); 