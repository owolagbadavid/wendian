export const CACHE_KEYS = {
  RESET_PASSWORD_OTP: (email: string) => `${email}:reset-otp`,
  VERIFY_EMAIL_OTP: (email: string) => `${email}:verify-otp`,
};

export const DEFAULT_CURRENCY = 'NGN';
export const DEFAULT_COUNTRY = 'NG';
