import { IsString } from "class-validator";

export class ValidateInviteCodeDto {
  @IsString()
  code!: string;
}
