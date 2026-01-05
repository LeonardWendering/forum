import { IsString, IsOptional } from "class-validator";

export class JoinSubcommunityDto {
  @IsString()
  @IsOptional()
  password?: string; // Required for PASSWORD_PROTECTED subcommunities
}
