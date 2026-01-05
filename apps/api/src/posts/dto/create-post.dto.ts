import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

export class CreatePostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsString()
  @IsOptional()
  parentId?: string; // For nested replies
}
