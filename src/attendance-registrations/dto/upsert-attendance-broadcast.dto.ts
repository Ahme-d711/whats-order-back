import { Matches } from 'class-validator';

export class UpsertAttendanceBroadcastDto {
  @Matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  startsAtLocal!: string;
}
