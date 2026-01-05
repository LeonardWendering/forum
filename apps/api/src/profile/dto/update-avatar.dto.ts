import { IsEnum, IsOptional } from "class-validator";
import { AvatarBodyType, AvatarSkinColor, AvatarHairstyle, AvatarAccessory } from "@prisma/client";

export class UpdateAvatarDto {
  @IsEnum(AvatarBodyType)
  bodyType!: AvatarBodyType;

  @IsEnum(AvatarSkinColor)
  skinColor!: AvatarSkinColor;

  @IsEnum(AvatarHairstyle)
  hairstyle!: AvatarHairstyle;

  @IsEnum(AvatarAccessory)
  @IsOptional()
  accessory?: AvatarAccessory;
}
