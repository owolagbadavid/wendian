/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { HelperService } from './helper.service';

import { HttpException } from '@nestjs/common';
import Decimal from 'decimal.js';
import { plainToClass } from 'class-transformer';

// Mock class for mapToClassCamelCase and mapArrayToClassCamelCase
class TestClass {
  userId: number;
  firstName: string;
  lastName: string;
}

// Test class for Normalize and Trim
class TransformTestClass {
  @HelperService.Normalize()
  normalizedField: string;

  @HelperService.Trim()
  trimmedField: string;
}

describe('HelperService', () => {
  beforeEach(() => {
    // Mock crypto.randomUUID for deterministic output
    jest
      .spyOn(require('node:crypto'), 'randomUUID')
      .mockReturnValue('123e4567-e89b-12d3-a456-426614174000');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRandomString', () => {
    it('should generate a random string of specified length', () => {
      const result = HelperService.generateRandomString(10);
      expect(result).toHaveLength(10);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate different strings on multiple calls', () => {
      const result1 = HelperService.generateRandomString(10);
      const result2 = HelperService.generateRandomString(10);
      expect(result1).not.toBe(result2);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(HelperService.isValidEmail('test@example.com')).toBe(true);
      expect(HelperService.isValidEmail('user.name@domain.co')).toBe(true);
    });

    it('should return false for invalid email', () => {
      expect(HelperService.isValidEmail('invalid')).toBe(false);
      expect(HelperService.isValidEmail('test@')).toBe(false);
      expect(HelperService.isValidEmail('@domain.com')).toBe(false);
      expect(HelperService.isValidEmail('test@domain')).toBe(false);
    });
  });

  describe('Normalize', () => {
    it('should trim and uppercase string', () => {
      const input = { normalizedField: '  hello world  ' };
      const result = plainToClass(TransformTestClass, input);
      expect(result.normalizedField).toBe('HELLO WORLD');
    });

    it('should return empty string for non-string input', () => {
      const input = { normalizedField: 123 };
      const result = plainToClass(TransformTestClass, input);
      expect(result.normalizedField).toBe('');
    });
  });

  describe('Trim', () => {
    it('should trim string', () => {
      const input = { trimmedField: '  hello world  ' };
      const result = plainToClass(TransformTestClass, input);
      expect(result.trimmedField).toBe('hello world');
    });

    it('should return empty string for non-string input', () => {
      const input = { trimmedField: 123 };
      const result = plainToClass(TransformTestClass, input);
      expect(result.trimmedField).toBe('');
    });
  });

  describe('generateRandomCode', () => {
    it('should generate a numeric code of specified length', () => {
      const result = HelperService.generateRandomCode(6);
      expect(result).toHaveLength(6);
      expect(result).toMatch(/^[0-9]+$/);
    });

    it('should throw Error for non-positive length', () => {
      expect(() => HelperService.generateRandomCode(0)).toThrow(
        'OTP length must be a positive number',
      );
      expect(() => HelperService.generateRandomCode(-1)).toThrow(
        'OTP length must be a positive number',
      );
    });
  });

  describe('mapToClassCamelCase', () => {
    it('should map snake_case data to camelCase class properties', () => {
      const data = {
        user_id: 1,
        first_name: 'John',
        last_name: 'Doe',
        ignored_field: 'test',
      };
      const result = HelperService.mapToClassCamelCase(TestClass, data);
      expect(result).toEqual({
        userId: 1,
        firstName: 'John',
        lastName: 'Doe',
      });
      expect(result).toBeInstanceOf(TestClass);
      expect((result as any).ignored_field).toBeUndefined();
    });

    it('should handle empty object', () => {
      const result = HelperService.mapToClassCamelCase(TestClass, {});
      expect(result).toEqual({
        userId: undefined,
        firstName: undefined,
        lastName: undefined,
      });
      expect(result).toBeInstanceOf(TestClass);
    });
  });

  describe('mapArrayToClassCamelCase', () => {
    it('should map array of snake_case objects to camelCase class instances', () => {
      const data = [
        { user_id: 1, first_name: 'John', last_name: 'Doe' },
        { user_id: 2, first_name: 'Jane', last_name: 'Smith' },
      ];
      const result = HelperService.mapArrayToClassCamelCase(TestClass, data);
      expect(result).toEqual([
        { userId: 1, firstName: 'John', lastName: 'Doe' },
        { userId: 2, firstName: 'Jane', lastName: 'Smith' },
      ]);
      expect(result[0]).toBeInstanceOf(TestClass);
      expect(result[1]).toBeInstanceOf(TestClass);
    });

    it('should handle empty array', () => {
      const result = HelperService.mapArrayToClassCamelCase(TestClass, []);
      expect(result).toEqual([]);
    });
  });

  describe('errorHandler', () => {
    it('should throw HttpException as-is', () => {
      const err = new HttpException('Custom error', 400);
      expect(() => HelperService.errorHandler(err)).toThrow(err);
      expect(() => HelperService.errorHandler(err)).toThrow('Custom error');
    });

    it('should wrap non-HttpException in HttpException with status 500', () => {
      const err = new Error('Generic error');
      expect(() => HelperService.errorHandler(err, 'Custom message')).toThrow(
        HttpException,
      );
      expect(() => HelperService.errorHandler(err, 'Custom message')).toThrow(
        'Custom message',
      );
      try {
        HelperService.errorHandler(err, 'Custom message');
      } catch (e) {
        expect(e.status).toBe(500);
      }
    });
  });

  describe('generateReference', () => {
    it('should generate a reference with random UUID', () => {
      const result = HelperService.generateReference();
      expect(result).toMatch(/[0-9A-F]{16}/);
      expect(result).toHaveLength(16);
      expect(result).toMatch(/^[0-9A-F]+$/);
    });

    it('should generate a reference with prefix and suffix', () => {
      const result = HelperService.generateReference({
        prefix: 'TXN',
        suffix: 'END',
      });
      expect(result).toMatch(/^TXN-[0-9A-F]{16}-END$/);
    });
  });

  describe('parseDecimals', () => {
    it('should parse specified string fields to numbers', () => {
      const row = { amount: '123.45', name: 'John', balance: '678.90' };
      const result = HelperService.parseDecimals(row, ['amount', 'balance']);
      expect(result).toEqual({
        amount: 123.45,
        name: 'John',
        balance: 678.9,
      });
    });

    it('should ignore non-string fields', () => {
      const row = { amount: 123.45, name: 'John', balance: '678.90' };
      const result = HelperService.parseDecimals(row, ['amount', 'balance']);
      expect(result).toEqual({
        amount: 123.45,
        name: 'John',
        balance: 678.9,
      });
    });
  });

  describe('keysToCamel', () => {
    it('should convert snake_case keys to camelCase', () => {
      const obj = {
        user_id: 1,
        first_name: 'John',
        nested_object: { last_name: 'Doe' },
      };
      const result = HelperService.keysToCamel(obj);
      expect(result).toEqual({
        userId: 1,
        firstName: 'John',
        nestedObject: { lastName: 'Doe' },
      });
    });

    it('should handle arrays', () => {
      const obj = [
        { user_id: 1, first_name: 'John' },
        { user_id: 2, first_name: 'Jane' },
      ];
      const result = HelperService.keysToCamel(obj);
      expect(result).toEqual([
        { userId: 1, firstName: 'John' },
        { userId: 2, firstName: 'Jane' },
      ]);
    });

    it('should preserve non-object types', () => {
      const obj = {
        date: new Date('2023-01-01'),
        buffer: Buffer.from('test'),
        decimal: new Decimal(123.45),
        string: 'test',
        number: 42,
        null: null,
      };
      const result = HelperService.keysToCamel(obj);
      expect(result).toEqual({
        date: obj.date,
        buffer: obj.buffer,
        decimal: obj.decimal,
        string: 'test',
        number: 42,
        null: null,
      });
    });
  });
});
