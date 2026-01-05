import { IsString, IsOptional, IsEnum, MaxLength } from "class-validator";
import { SubcommunityType } from "@prisma/client";

export class UpdateSubcommunityDto {
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @IsEnum(SubcommunityType)
  @IsOptional()
  type?: SubcommunityType;

  @IsString()
  @IsOptional()
  password?: string;
}
