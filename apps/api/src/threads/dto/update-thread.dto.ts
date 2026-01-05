import { IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";

export class UpdateThreadDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsBoolean()
  @IsOptional()
  isLocked?: boolean;
}
