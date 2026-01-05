import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards
} from "@nestjs/common";
import { SubcommunitiesService } from "./subcommunities.service";
import { CreateSubcommunityDto, UpdateSubcommunityDto, JoinSubcommunityDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import type { PublicUser } from "../auth/auth.types";

@Controller("subcommunities")
@UseGuards(JwtAuthGuard)
export class SubcommunitiesController {
  constructor(private readonly subcommunitiesService: SubcommunitiesService) {}

  @Post()
  create(@Body() dto: CreateSubcommunityDto, @CurrentUser() user: PublicUser) {
    return this.subcommunitiesService.create(dto, user.id);
  }

  @Get()
  @Public()
  findAll(@CurrentUser() user?: PublicUser) {
    return this.subcommunitiesService.findAll(user?.id);
  }

  @Get(":slug")
  @Public()
  findOne(@Param("slug") slug: string, @CurrentUser() user?: PublicUser) {
    return this.subcommunitiesService.findBySlug(slug, user?.id);
  }

  @Patch(":slug")
  update(
    @Param("slug") slug: string,
    @Body() dto: UpdateSubcommunityDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.subcommunitiesService.update(slug, dto, user.id);
  }

  @Post(":slug/join")
  join(
    @Param("slug") slug: string,
    @Body() dto: JoinSubcommunityDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.subcommunitiesService.join(slug, dto, user.id);
  }

  @Delete(":slug/leave")
  leave(@Param("slug") slug: string, @CurrentUser() user: PublicUser) {
    return this.subcommunitiesService.leave(slug, user.id);
  }

  @Get(":slug/members")
  getMembers(@Param("slug") slug: string, @CurrentUser() user: PublicUser) {
    return this.subcommunitiesService.getMembers(slug, user.id);
  }
}
