export const CACHE_KEYS = {
  RESET_PASSWORD_OTP: (email: string) => `${email}:reset-otp`,
  VERIFY_EMAIL_OTP: (email: string) => `${email}:verify-otp`,
};

export const DEFAULT_CURRENCY = 'NGN';
export const DEFAULT_COUNTRY = 'NG';
export const DEFAULT_MAX_NUMBER = 1000000000000; // 1 trillion
export const ONE_MINUTE_IN_MS = 60 * 1000; // 1 minute in milliseconds
