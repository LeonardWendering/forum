import { IsString, IsOptional, MinLength, MaxLength } from "class-validator";

/**
 * DTO for bot creating a new post/reply
 */
export class CreateBotPostDto {
  @IsString()
  threadId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;

  @IsString()
  @IsOptional()
  parentPostId?: string;
}
