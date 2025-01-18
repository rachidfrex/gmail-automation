const { setupBrowser, login } = require('../services/browserService');
const { chromium, devices } = require('@playwright/test');

const mockDevices = {
  'iPhone 12': { userAgent: 'iPhone', viewport: { width: 390, height: 844 } }
};

jest.mock('@playwright/test', () => ({
  chromium: {
    launch: jest.fn()
  },
  devices: mockDevices
}));

describe('Browser Service', () => {
  let mockBrowser, mockContext, mockPage;

  beforeEach(() => {
    mockPage = {
      goto: jest.fn(),
      fill: jest.fn(),
      click: jest.fn(),
      waitForURL: jest.fn()
    };

    mockContext = {
      newPage: jest.fn().mockResolvedValue(mockPage)
    };

    mockBrowser = {
      newContext: jest.fn().mockResolvedValue(mockContext)
    };

    chromium.launch.mockResolvedValue(mockBrowser);
  });

  describe('setupBrowser', () => {
    it('should setup browser for desktop correctly', async () => {
      const result = await setupBrowser(false);
      
      expect(chromium.launch).toHaveBeenCalledWith({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
      });
      
      expect(result).toHaveProperty('browser');
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('page');
    });

    it('should setup browser for mobile correctly', async () => {
      await setupBrowser(true);
      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining(mockDevices['iPhone 12'])
      );
    });
  });

  describe('login', () => {
    it('should perform login sequence correctly', async () => {
      await login(mockPage, 'test@example.com', 'password');

      expect(mockPage.goto).toHaveBeenCalledWith('https://gmail.com');
      expect(mockPage.fill).toHaveBeenCalledWith('input[type="email"]', 'test@example.com');
      expect(mockPage.fill).toHaveBeenCalledWith('input[type="password"]', 'password');
      expect(mockPage.waitForURL).toHaveBeenCalledWith('https://mail.google.com/**');
    });
  });
});
