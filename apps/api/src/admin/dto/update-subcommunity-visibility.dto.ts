import { IsEnum } from "class-validator";
import { SubcommunityType } from "@prisma/client";

export class UpdateSubcommunityVisibilityDto {
  @IsEnum(SubcommunityType)
  type: SubcommunityType;
}
