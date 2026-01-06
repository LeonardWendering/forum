import { IsEnum, IsOptional, IsString } from "class-validator";
import { UserStatus } from "@prisma/client";

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}
