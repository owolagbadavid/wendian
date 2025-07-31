import { pbkdf2Sync, timingSafeEqual } from 'node:crypto';
import { PasswordHasher } from './password-hasher.service';

describe('PasswordHasher', () => {
  describe('hashPassword', () => {
    it('should generate a base64-encoded hash with salt and hash', () => {
      const password = 'testPassword123';
      const hashedPassword = PasswordHasher.hashPassword(password);

      // Decode base64 to check length (salt: 16 bytes + hash: 64 bytes = 80 bytes)
      const hashBytes = Buffer.from(hashedPassword, 'base64');
      expect(hashBytes.length).toBe(16 + 64); // SALT_SIZE + KEY_SIZE

      // Verify the hash can be decoded and split
      const salt = hashBytes.subarray(0, 16);
      const hash = hashBytes.subarray(16);
      expect(salt.length).toBe(16);
      expect(hash.length).toBe(64);

      // Verify the hash matches the computed hash
      const computedHash = pbkdf2Sync(password, salt, 100000, 64, 'sha256');
      expect(timingSafeEqual(hash, computedHash)).toBe(true);
    });

    it('should generate different hashes for the same password', () => {
      const password = 'testPassword123';
      const hash1 = PasswordHasher.hashPassword(password);
      const hash2 = PasswordHasher.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    });

    it('should handle empty password', () => {
      const hashedPassword = PasswordHasher.hashPassword('');
      const hashBytes = Buffer.from(hashedPassword, 'base64');
      expect(hashBytes.length).toBe(16 + 64); // SALT_SIZE + KEY_SIZE
    });
  });

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {
      const password = 'testPassword123';
      const hashedPassword = PasswordHasher.hashPassword(password);

      const result = PasswordHasher.verifyPassword(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = PasswordHasher.hashPassword(password);

      const result = PasswordHasher.verifyPassword(
        wrongPassword,
        hashedPassword,
      );
      expect(result).toBe(false);
    });

    it('should return false for invalid base64 hashedPassword', () => {
      const password = 'testPassword123';
      const invalidHashedPassword = 'not-a-valid-base64-string';

      const result = PasswordHasher.verifyPassword(
        password,
        invalidHashedPassword,
      );
      expect(result).toBe(false);
    });

    it('should return false for hashedPassword with incorrect length', () => {
      const password = 'testPassword123';
      // Create a base64 string with incorrect length (e.g., less than 16 + 64 bytes)
      const invalidHashBytes = Buffer.from('short', 'utf8');
      const invalidHashedPassword = invalidHashBytes.toString('base64');

      const result = PasswordHasher.verifyPassword(
        password,
        invalidHashedPassword,
      );
      expect(result).toBe(false);
    });
  });
});
