import { IsString, IsOptional, IsEnum } from "class-validator";
import { SubcommunityType } from "@prisma/client";

/**
 * DTO for creating a community with auto-generated name (admin endpoint)
 */
export class CreateAdminCommunityDto {
  @IsString()
  @IsOptional()
  nameStyle?: "nature" | "cozy" | "friendly";

  @IsEnum(SubcommunityType)
  type!: SubcommunityType;

  @IsString()
  @IsOptional()
  description?: string;
}
