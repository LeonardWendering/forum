import {
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  IsEnum,
  Min,
  Max,
  ValidateNested
} from "class-validator";
import { Type } from "class-transformer";

// Avatar configuration for a single bot
class AvatarConfigDto {
  @IsString()
  @IsOptional()
  bodyType?: "MALE" | "FEMALE" | "NEUTRAL" | "random";

  @IsString()
  @IsOptional()
  skinColor?: "LIGHT" | "MEDIUM" | "DARK" | "random";

  @IsString()
  @IsOptional()
  hairstyle?: string;

  @IsString()
  @IsOptional()
  accessory?: string;
}

// Avatar rules for batch creation
class AvatarRulesDto {
  @IsObject()
  @IsOptional()
  bodyTypeDistribution?: { MALE: number; FEMALE: number; NEUTRAL: number };

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  accessoryChance?: number;
}

/**
 * DTO for creating a single bot account
 */
export class CreateBotDto {
  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  subcommunityId!: string;

  @ValidateNested()
  @Type(() => AvatarConfigDto)
  @IsOptional()
  avatarConfig?: AvatarConfigDto;
}

/**
 * DTO for creating multiple bot accounts at once
 */
export class CreateBotBatchDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  count!: number;

  @IsString()
  subcommunityId!: string;

  @ValidateNested()
  @Type(() => AvatarRulesDto)
  @IsOptional()
  avatarRules?: AvatarRulesDto;
}
