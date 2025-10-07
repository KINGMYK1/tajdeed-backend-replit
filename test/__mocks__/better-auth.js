// Mock pour Better Auth dans les tests E2E
module.exports = {
  betterAuth: jest.fn(() => ({
    api: {
      signUpEmail: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id', email: 'test@example.com' } }
      })),
      signInEmail: jest.fn(() => Promise.resolve({ 
        data: { 
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { token: 'test-token' }
        }
      })),
      verifyEmail: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user-id' } }
      })),
      signOut: jest.fn(() => Promise.resolve({ data: {} })),
      getSession: jest.fn(() => Promise.resolve({ 
        data: { 
          user: { id: 'test-user-id', email: 'test@example.com' },
          session: { token: 'test-token' }
        }
      }))
    },
    handler: jest.fn((req, res) => {
      res.status(200).json({ success: true });
    })
  }))
};