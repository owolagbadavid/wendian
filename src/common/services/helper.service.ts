/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// import { ConflictException, ServiceUnavailableException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { Transform } from 'class-transformer';
import { camelCase } from 'lodash';
import { HttpException } from '@nestjs/common';
import Decimal from 'decimal.js';

export class HelperService {
  // static isQueryFailedError = (
  //   err: unknown,
  // ): err is QueryFailedError & DatabaseError => err instanceof QueryFailedError;

  // static handleDbError(err: unknown, message: string): Error | undefined {
  //   if (HelperService.isQueryFailedError(err)) {
  //     const { detail, table, constraint } = err;
  //     const columnMatch = detail?.match(/Key \((.*?)\)=/);
  //     const columnName = columnMatch ? columnMatch[1] : constraint;

  //     switch (err.code) {
  //       case PgErrorCode.PG_UNIQUE_VIOLATION:
  //         return new ConflictException(
  //           `Duplicate entry in table '${table}' for column '${columnName}'`,
  //         );
  //       default:
  //         return new ServiceUnavailableException(message);
  //     }
  //   }
  // }

  static generateRandomString(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  }

  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static Normalize() {
    return Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : '',
    );
  }

  static Trim() {
    return Transform(({ value }) =>
      typeof value === 'string' ? value.trim() : '',
    );
  }

  static generateRandomCode(length: number): string {
    if (length <= 0) {
      throw new Error('OTP length must be a positive number');
    }

    const characters = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += characters.charAt(randomInt(0, characters.length));
    }
    return otp;
  }

  static mapToClassCamelCase<T extends object>(
    cls: new () => T,
    data: Record<string, any>,
  ): T {
    const instance = new cls();

    Object.entries(data).forEach(([key, value]) => {
      const camelKey = camelCase(key);
      if (camelKey in instance) {
        instance[camelKey] = value;
      }
    });

    return instance;
  }

  static mapArrayToClassCamelCase<T extends object>(
    cls: new () => T,
    rows: Record<string, any>[],
  ): T[] {
    return rows.map((row) => this.mapToClassCamelCase(cls, row));
  }

  static errorHandler(
    err: unknown,
    message: string = 'An error occurred',
  ): never {
    if (err instanceof HttpException) {
      throw err;
    }

    throw new HttpException(message, 500);
  }

  static generateReference(options?: {
    prefix?: string;
    suffix?: string;
  }): string {
    const randomId = crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(0, 16)
      .toUpperCase();

    const prefix = options?.prefix ? `${options.prefix}-` : '';
    const suffix = options?.suffix ? `-${options.suffix}` : '';

    return `${prefix}${randomId}${suffix}`;
  }

  static parseDecimals<T>(row: T, decimalFields: (keyof T)[]): T {
    for (const field of decimalFields) {
      if (typeof row[field] === 'string') {
        row[field] = parseFloat(
          row[field] as unknown as string,
        ) as T[typeof field];
      }
    }
    return row;
  }

  static keysToCamel(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map((v) => HelperService.keysToCamel(v));
    }

    if (
      obj !== null &&
      typeof obj === 'object' &&
      !(obj instanceof Date) &&
      !(obj instanceof Buffer) &&
      !(obj instanceof Map) &&
      !(obj instanceof Set) &&
      !(obj instanceof Decimal)
    ) {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        const camelKey = camelCase(key);
        acc[camelKey] = HelperService.keysToCamel(value);
        return acc;
      }, {} as any);
    }

    return obj;
  }
}
