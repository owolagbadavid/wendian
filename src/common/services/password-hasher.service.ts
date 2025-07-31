import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';

export class PasswordHasher {
  private static readonly SALT_SIZE = 16; // 128 bits
  private static readonly ITERATIONS = 100000; // Number of iterations for PBKDF2
  private static readonly KEY_SIZE = 64; // 512 bits

  static hashPassword(password: string): string {
    const salt = randomBytes(this.SALT_SIZE);
    const hash = pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_SIZE,
      'sha256',
    );

    const hashBytes = Buffer.concat([salt, hash]);
    return hashBytes.toString('base64');
  }

  static verifyPassword(password: string, hashedPassword: string): boolean {
    // Validate base64 string
    if (!/^[A-Za-z0-9+/=]+$/.test(hashedPassword)) {
      return false; // Invalid base64 characters
    }

    let hashBytes: Buffer;
    try {
      hashBytes = Buffer.from(hashedPassword, 'base64');
    } catch {
      return false; // Invalid base64 encoding
    }

    // Validate buffer length
    if (hashBytes.length !== this.SALT_SIZE + this.KEY_SIZE) {
      return false; // Incorrect length
    }

    const salt = hashBytes.subarray(0, this.SALT_SIZE);
    const storedHash = hashBytes.subarray(this.SALT_SIZE);

    const computedHash = pbkdf2Sync(
      password,
      salt,
      this.ITERATIONS,
      this.KEY_SIZE,
      'sha256',
    );

    return timingSafeEqual(computedHash, storedHash);
  }
}
