import { IsString, MinLength, MaxLength } from "class-validator";

export class CreateThreadDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  content!: string; // Initial post content
}
