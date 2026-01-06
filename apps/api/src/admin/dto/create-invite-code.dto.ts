import { IsString, IsBoolean, IsOptional, IsNumber, IsDateString, Min } from "class-validator";

export class CreateInviteCodeDto {
  @IsString()
  subcommunityId: string;

  @IsBoolean()
  @IsOptional()
  isRestricted?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  usesRemaining?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
