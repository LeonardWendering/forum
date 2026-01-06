import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards
} from "@nestjs/common";
import { AdminService } from "./admin.service";
import { CreateInviteCodeDto, UpdateSubcommunityVisibilityDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserRole } from "@prisma/client";
import type { PublicUser } from "../auth/auth.types";

@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // Invite Code Endpoints
  // ============================================

  @Post("invite-codes")
  createInviteCode(
    @Body() dto: CreateInviteCodeDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.createInviteCode(dto, user.id);
  }

  @Get("invite-codes")
  listInviteCodes() {
    return this.adminService.listInviteCodes();
  }

  @Delete("invite-codes/:id")
  deleteInviteCode(@Param("id") id: string) {
    return this.adminService.deleteInviteCode(id);
  }

  // ============================================
  // User Management Endpoints
  // ============================================

  @Get("users")
  listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    return this.adminService.listUsers(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Patch("users/:userId/suspend")
  suspendUser(
    @Param("userId") userId: string,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.suspendUser(userId, user.id);
  }

  @Patch("users/:userId/unsuspend")
  unsuspendUser(@Param("userId") userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  @Delete("users/:userId")
  deleteUser(
    @Param("userId") userId: string,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.deleteUser(userId, user.id);
  }

  // ============================================
  // Subcommunity Moderation Endpoints
  // ============================================

  @Post("subcommunities/:id/mute")
  muteSubcommunity(
    @Param("id") id: string,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.muteSubcommunity(id, user.id);
  }

  @Post("subcommunities/:id/unmute")
  unmuteSubcommunity(@Param("id") id: string) {
    return this.adminService.unmuteSubcommunity(id);
  }

  @Patch("subcommunities/:id/visibility")
  updateSubcommunityVisibility(
    @Param("id") id: string,
    @Body() dto: UpdateSubcommunityVisibilityDto
  ) {
    return this.adminService.updateSubcommunityVisibility(id, dto);
  }

  @Delete("subcommunities/:id")
  deleteSubcommunity(@Param("id") id: string) {
    return this.adminService.deleteSubcommunity(id);
  }

  // ============================================
  // Thread Moderation Endpoints
  // ============================================

  @Post("threads/:id/mute")
  muteThread(
    @Param("id") id: string,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.muteThread(id, user.id);
  }

  @Post("threads/:id/unmute")
  unmuteThread(@Param("id") id: string) {
    return this.adminService.unmuteThread(id);
  }

  // ============================================
  // Post Moderation Endpoints
  // ============================================

  @Post("posts/:id/mute")
  mutePost(
    @Param("id") id: string,
    @CurrentUser() user: PublicUser
  ) {
    return this.adminService.mutePost(id, user.id);
  }

  @Post("posts/:id/unmute")
  unmutePost(@Param("id") id: string) {
    return this.adminService.unmutePost(id);
  }
}
