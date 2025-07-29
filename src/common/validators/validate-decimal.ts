/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import Decimal from 'decimal.js';

// Custom validator for Decimal numbers
@ValidatorConstraint({ name: 'isValidDecimal', async: false })
export class IsValidDecimalConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    try {
      if (typeof value === 'number' || typeof value === 'string') {
        const decimalValue = new Decimal(value);

        if (decimalValue.isNaN() || !decimalValue.isFinite()) {
          return false;
        }

        const decimalPlaces = decimalValue.decimalPlaces();
        if (decimalPlaces > 2) {
          return false;
        }

        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} must be a valid decimal number with up to 2 decimal places`;
  }
}

export function IsValidDecimal(validationOptions?: any) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidDecimalConstraint,
    });
  };
}
