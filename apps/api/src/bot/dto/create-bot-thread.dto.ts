import { IsString, MinLength, MaxLength } from "class-validator";

/**
 * DTO for bot creating a new thread
 */
export class CreateBotThreadDto {
  @IsString()
  subcommunitySlug!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string;
}
