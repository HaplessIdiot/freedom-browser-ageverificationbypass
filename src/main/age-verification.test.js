/**
 * Unit tests for age-verification module
 */

const { spawn } = require('child_process');

// Mock the child_process module
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const { spawn: mockSpawn } = require('child_process');

describe('age-verification', () => {
  let ageVerification;
  let mockLog;

  beforeEach(() => {
    // Reset all mocks
    jest.resetModules();
    jest.clearAllMocks();

    // Create mock logger
    mockLog = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('./logger', () => mockLog);

    // Re-require the module after setting up mocks
    ageVerification = require('./age-verification');
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('initAgeVerification', () => {
    it('should initialize and detect available service', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('verified')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      await ageVerification.initAgeVerification();

      expect(mockLog.info).toHaveBeenCalledWith(
        '[age-verification] ageD service is available'
      );
    });

    it('should handle unavailable service', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn((event, cb) => cb('not found')) },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(1);
          }),
        };
      });

      await ageVerification.initAgeVerification();

      expect(mockLog.warn).toHaveBeenCalledWith(
        '[age-verification] ageD service not available:',
        expect.any(String)
      );
    });
  });

  describe('getAgeBracket', () => {
    it('should return adult bracket when service is available', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('adult')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      const result = await ageVerification.getAgeBracket();

      expect(result).toEqual({
        verified: true,
        ageBracket: 'adult',
        status: 'verified',
      });
    });

    it('should return unavailable when service is not available', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn((event, cb) => cb('not found')) },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(1);
          }),
        };
      });

      const result = await ageVerification.getAgeBracket();

      expect(result).toEqual({
        verified: false,
        status: 'service unavailable',
      });
    });
  });

  describe('getUserAge', () => {
    it('should return adult age when service is available', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('adult')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      const result = await ageVerification.getUserAge();

      expect(result).toEqual({
        ageVerified: true,
        status: 'adult',
        age: 25,
      });
    });
  });

  describe('checkVerification', () => {
    it('should return verified when service is available', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('verified')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      const result = await ageVerification.checkVerification();

      expect(result).toEqual({
        verified: true,
        age: 25,
      });
    });

    it('should return not verified when service is unavailable', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn() },
          stderr: { on: jest.fn((event, cb) => cb('error')) },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(1);
          }),
        };
      });

      const result = await ageVerification.checkVerification();

      expect(result).toEqual({
        verified: false,
      });
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with null-attestation', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('verified')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      const result = await ageVerification.authenticate('testuser');

      expect(result).toEqual({
        success: true,
        message: 'verified (null-attestation)',
      });
    });
  });

  describe('isServiceAvailable', () => {
    it('should return false when service is not initialized', () => {
      const result = ageVerification.isServiceAvailable();
      expect(result).toBe(false);
    });
  });

  describe('listVerifications', () => {
    it('should return list of verifications when service is available', async () => {
      mockSpawn.mockImplementation(() => {
        return {
          stdout: { on: jest.fn((event, cb) => cb('verified')) },
          stderr: { on: jest.fn() },
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
        };
      });

      const result = await ageVerification.listVerifications();

      expect(result).toEqual({
        verifications: [
          { name: 'age-verification', status: 'verified' },
          { name: 'current-user', status: 'unrestricted' },
          { name: 'session-state', status: 'active' },
        ],
      });
    });
  });
});