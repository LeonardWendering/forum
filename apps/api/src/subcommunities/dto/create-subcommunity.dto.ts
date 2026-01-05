import { IsString, IsOptional, IsEnum, MinLength, MaxLength, Matches } from "class-validator";
import { SubcommunityType } from "@prisma/client";

export class CreateSubcommunityDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens"
  })
  slug!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(SubcommunityType)
  @IsOptional()
  type?: SubcommunityType;

  @IsString()
  @IsOptional()
  @MinLength(6)
  password?: string; // Required if type is PASSWORD_PROTECTED
}
