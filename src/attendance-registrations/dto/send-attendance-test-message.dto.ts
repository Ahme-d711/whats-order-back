import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

export class SendAttendanceTestMessageDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @Matches(/^[1-9]\d{7,14}$/)
  phone!: string;
}
