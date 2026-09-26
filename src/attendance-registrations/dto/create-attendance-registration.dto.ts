import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const NO_CONTROL_CHARACTERS = /^[^\p{Cc}]*$/u;
const INTERNATIONAL_PHONE_DIGITS = /^[1-9]\d{7,14}$/;

function normalizeText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim();
}

export function normalizePhone(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const latinDigits = value
    .normalize('NFKC')
    .replace(/[٠-٩]/gu, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/gu, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  const compact = latinDigits.replace(/[\s().+-]/gu, '');

  if (/^01\d{9}$/.test(compact)) {
    return `20${compact.slice(1)}`;
  }
  if (/^20\d{10}$/.test(compact)) {
    return compact;
  }
  if (/^0020\d{10}$/.test(compact)) {
    return compact.slice(2);
  }
  return compact;
}

export class CreateAttendanceRegistrationDto {
  @Transform(({ value }: TransformFnParams) => normalizeText(value))
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  fullName!: string;

  @Transform(({ value }: TransformFnParams) => normalizePhone(value))
  @IsString()
  @Matches(INTERNATIONAL_PHONE_DIGITS, {
    message: 'whatsOrderPhone must be a valid international phone number',
  })
  whatsOrderPhone!: string;

  @Transform(({ value }: TransformFnParams) => normalizeText(value))
  @IsString()
  @Length(2, 120)
  @Matches(NO_CONTROL_CHARACTERS)
  activity!: string;

  @Transform(({ value }: TransformFnParams) => normalizeText(value))
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  @Matches(NO_CONTROL_CHARACTERS)
  address!: string;
}
