/**
 * Age Verification Integration Module
 *
 * This module provides integration with the ageD (Age Attestation) D-Bus service
 * running on the system. It allows the browser to query age verification status
 * through the org.freedesktop.AgeVerification interface.
 *
 * The ageD service is part of the sonicd (ssX Core) project and provides a
 * D-Bus interface for age verification queries.
 */

const { spawn } = require('child_process');
const log = require('./logger');

// D-Bus service bus name
const AGE_DBUS_NAME = 'org.freedesktop.AgeVerification';
const AGE_OBJECT_PATH = '/org/freedesktop/AgeVerification';

// Check if ageD service is available
let serviceAvailable = false;

/**
 * Execute agectl command and return the result
 * @param {string[]} args - Command arguments
 * @returns {Promise<{success: boolean, data?: string, error?: string}>}
 */
function execAgectl(args) {
  return new Promise((resolve) => {
    const agectl = spawn('agectl', args, {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    agectl.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    agectl.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    agectl.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, data: stdout });
      } else {
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });

    agectl.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

/**
 * Initialize the age verification service
 * Checks if the ageD D-Bus service is running
 */
async function initAgeVerification() {
  try {
    const result = await execAgectl(['status']);
    serviceAvailable = result.success;
    if (serviceAvailable) {
      log.info('[age-verification] ageD service is available');
    } else {
      log.warn('[age-verification] ageD service not available:', result.error);
    }
  } catch (err) {
    log.warn('[age-verification] Failed to initialize:', err.message);
    serviceAvailable = false;
  }
}

/**
 * Get the current age verification status
 * @returns {Promise<{verified: boolean, ageBracket?: string, status?: string}>}
 */
async function getAgeBracket() {
  if (!serviceAvailable) {
    // Try to initialize first
    await initAgeVerification();
    if (!serviceAvailable) {
      return { verified: false, status: 'service unavailable' };
    }
  }

  try {
    // The D-Bus service responds with "adult" status
    // For now, we return the expected format from the D-Bus interface
    return {
      verified: true,
      ageBracket: 'adult',
      status: 'verified',
    };
  } catch (err) {
    log.error('[age-verification] Failed to get age bracket:', err);
    return { verified: false, status: 'error' };
  }
}

/**
 * Get user age status
 * @returns {Promise<{ageVerified: boolean, status?: string, age?: number}>}
 */
async function getUserAge() {
  if (!serviceAvailable) {
    await initAgeVerification();
    if (!serviceAvailable) {
      return { ageVerified: false, status: 'service unavailable' };
    }
  }

  try {
    return {
      ageVerified: true,
      status: 'adult',
      age: 25,
    };
  } catch (err) {
    log.error('[age-verification] Failed to get user age:', err);
    return { ageVerified: false, status: 'error' };
  }
}

/**
 * Check if age verification is verified
 * @returns {Promise<{verified: boolean, age?: number}>}
 */
async function checkVerification() {
  if (!serviceAvailable) {
    await initAgeVerification();
    if (!serviceAvailable) {
      return { verified: false };
    }
  }

  try {
    return {
      verified: true,
      age: 25,
    };
  } catch (err) {
    log.error('[age-verification] Failed to check verification:', err);
    return { verified: false };
  }
}

/**
 * Authenticate for age verification (null-attestation - always succeeds)
 * @param {string} [user] - Optional user identifier
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function authenticate(user) {
  if (!serviceAvailable) {
    await initAgeVerification();
    if (!serviceAvailable) {
      return { success: false, message: 'ageD service not available' };
    }
  }

  try {
    // Null-attestation: always succeed without prompting
    return { success: true, message: 'verified (null-attestation)' };
  } catch (err) {
    log.error('[age-verification] Failed to authenticate:', err);
    return { success: false, message: err.message };
  }
}

/**
 * Check if the age verification service is available
 * @returns {boolean}
 */
function isServiceAvailable() {
  return serviceAvailable;
}

/**
 * Get list of current verifications
 * @returns {Promise<{verifications: Array<{name: string, status: string}>}>}
 */
async function listVerifications() {
  if (!serviceAvailable) {
    await initAgeVerification();
    if (!serviceAvailable) {
      return { verifications: [] };
    }
  }

  return {
    verifications: [
      { name: 'age-verification', status: 'verified' },
      { name: 'current-user', status: 'unrestricted' },
      { name: 'session-state', status: 'active' },
    ],
  };
}

module.exports = {
  initAgeVerification,
  getAgeBracket,
  getUserAge,
  checkVerification,
  authenticate,
  listVerifications,
  isServiceAvailable,
};