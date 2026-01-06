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
import { ThreadsService } from "./threads.service";
import { CreateThreadDto, UpdateThreadDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import type { PublicUser } from "../auth/auth.types";

@Controller()
@UseGuards(JwtAuthGuard)
export class ThreadsController {
  constructor(private readonly threadsService: ThreadsService) {}

  @Post("subcommunities/:slug/threads")
  create(
    @Param("slug") slug: string,
    @Body() dto: CreateThreadDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.threadsService.create(slug, dto, user.id);
  }

  @Get("subcommunities/:slug/threads")
  @Public()
  findBySubcommunity(
    @Param("slug") slug: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @CurrentUser() user?: PublicUser
  ) {
    return this.threadsService.findBySubcommunity(
      slug,
      user?.id,
      user?.role,
      user?.isRestricted,
      user?.restrictedToSubcommunityId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20
    );
  }

  @Get("threads/:id")
  @Public()
  findOne(@Param("id") id: string, @CurrentUser() user?: PublicUser) {
    return this.threadsService.findById(id, user?.id, user?.role);
  }

  @Patch("threads/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateThreadDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.threadsService.update(id, dto, user.id, user.role);
  }

  @Delete("threads/:id")
  delete(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.threadsService.delete(id, user.id, user.role);
  }
}
