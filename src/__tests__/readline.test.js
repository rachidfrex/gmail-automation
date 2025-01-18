const { getUserInput } = require('../config/readline');
const readline = require('readline');

jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn(),
    close: jest.fn()
  })
}));

describe('Readline Config', () => {
  let mockReadline;
  
  beforeEach(() => {
    mockReadline = readline.createInterface();
    
    let questionCounter = 0;
    const responses = [
      'test@example.com',    // email
      'password123',         // password
      'recipient@example.com', // recipient
      'Test Subject',        // subject
      'Test Body',          // body
      '10'                  // number of emails
    ];
    
    mockReadline.question = jest.fn((query, callback) => {
      callback(responses[questionCounter++]);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should get user input correctly', async () => {
    const result = await getUserInput();

    expect(result).toEqual({
      email: 'test@example.com',
      password: 'password123',
      emailDetails: {
        to: 'recipient@example.com',
        subject: 'Test Subject',
        body: 'Test Body'
      },
      numberOfEmails: 10
    });

    expect(mockReadline.close).toHaveBeenCalled();
  });
});
