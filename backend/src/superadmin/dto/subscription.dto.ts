import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const SUBSCRIPTION_STATUSES = [
  'trial',
  'active',
  'past_due',
  'cancelled',
] as const;

export class MarkPaidDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  months?: number;
}

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsIn(SUBSCRIPTION_STATUSES)
  status?: (typeof SUBSCRIPTION_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsDateString()
  currentPeriodEndsAt?: string;
}
