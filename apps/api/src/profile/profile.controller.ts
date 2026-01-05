import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import { ProfileService } from "./profile.service";
import { UpdateAvatarDto } from "./dto/update-avatar.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get("profile/me")
  async getMyProfile(@CurrentUser("id") userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get("profile/me/has-avatar")
  async hasAvatar(@CurrentUser("id") userId: string) {
    const hasAvatar = await this.profileService.hasAvatar(userId);
    return { hasAvatar };
  }

  @Patch("profile/me/avatar")
  async updateMyAvatar(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateAvatarDto
  ) {
    return this.profileService.updateAvatar(userId, dto);
  }

  @Get("users/:userId")
  @Public()
  async getPublicProfile(@Param("userId") userId: string) {
    return this.profileService.getPublicProfile(userId);
  }

  @Delete("profile/me")
  async deleteAccount(@CurrentUser("id") userId: string) {
    return this.profileService.deleteAccount(userId);
  }
}
