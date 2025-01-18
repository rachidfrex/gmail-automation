jest.setTimeout(30000);

process.env.TEST_EMAIL = 'test@example.com';
process.env.TEST_PASSWORD = 'testpassword';

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};
