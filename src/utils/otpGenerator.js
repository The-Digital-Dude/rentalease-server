import crypto from 'crypto';

/**
 * Generate a random OTP
 * @param {number} length - Length of the OTP (default: 6)
 * @returns {string} - Generated OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  
  return otp;
};

/**
 * Generate OTP expiration time
 * @param {number} minutes - Minutes until expiration (default: 10)
 * @returns {Date} - Expiration date
 */
const generateOTPExpiration = (minutes = 10) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Check if OTP is expired
 * @param {Date} expirationTime - OTP expiration time
 * @returns {boolean} - True if expired, false otherwise
 */
const isOTPExpired = (expirationTime) => {
  return new Date() > expirationTime;
};

/**
 * Hash OTP for secure storage
 * @param {string} otp - OTP to hash
 * @returns {string} - Hashed OTP
 */
const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP against hash
 * @param {string} otp - OTP to verify
 * @param {string} hashedOTP - Hashed OTP to compare against
 * @returns {boolean} - True if OTP matches hash
 */
const verifyOTP = (otp, hashedOTP) => {
  const inputHash = crypto.createHash('sha256').update(otp).digest('hex');
  return inputHash === hashedOTP;
};

export {
  generateOTP,
  generateOTPExpiration,
  isOTPExpired,
  hashOTP,
  verifyOTP
}; 