const { getLatestEmails, composeEmail, markAsRead } = require('../services/emailService');

describe('Email Service', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      waitForSelector: jest.fn(),
      evaluate: jest.fn(),
      fill: jest.fn(),
      click: jest.fn(),
      waitForTimeout: jest.fn(),
      $$: jest.fn()
    };
  });

  describe('getLatestEmails', () => {
    it('should fetch and parse emails correctly', async () => {
      const mockEmails = [
        {
          sender: 'Test Sender',
          subject: 'Test Subject',
          preview: 'Test Preview',
          date: '2024-01-01',
          isUnread: true,
          hasAttachment: false,
          isStarred: false
        }
      ];

      mockPage.evaluate.mockResolvedValue(mockEmails);

      const result = await getLatestEmails(mockPage, 1);
      expect(result).toEqual(mockEmails);
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('tr[role="row"]', { timeout: 30000 });
    });

    it('should handle errors gracefully', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout'));
      await expect(getLatestEmails(mockPage)).rejects.toThrow('Timeout');
    });
  });

  describe('composeEmail', () => {
    const emailDetails = {
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };

    it('should compose and send email correctly', async () => {
      await composeEmail(mockPage, emailDetails);

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('div[role="button"][gh="cm"]', { timeout: 60000 });
      expect(mockPage.fill).toHaveBeenCalledWith(expect.any(String), emailDetails.to);
      expect(mockPage.fill).toHaveBeenCalledWith(expect.any(String), emailDetails.subject);
      expect(mockPage.fill).toHaveBeenCalledWith(expect.any(String), emailDetails.body);
    });
  });
});
