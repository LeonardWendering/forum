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
import { PostsService } from "./posts.service";
import { CreatePostDto, UpdatePostDto, VoteDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { Public } from "../auth/decorators/public.decorator";
import type { PublicUser } from "../auth/auth.types";

@Controller()
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post("threads/:threadId/posts")
  create(
    @Param("threadId") threadId: string,
    @Body() dto: CreatePostDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.postsService.create(threadId, dto, user.id);
  }

  @Get("threads/:threadId/posts")
  @Public()
  findByThread(
    @Param("threadId") threadId: string,
    @CurrentUser() user?: PublicUser
  ) {
    return this.postsService.findByThread(threadId, user?.id, user?.role);
  }

  @Get("posts/recent")
  @Public()
  findRecent(
    @Query("limit") limit?: string,
    @CurrentUser() user?: PublicUser
  ) {
    return this.postsService.findRecent(
      limit ? parseInt(limit, 10) : 2,
      user?.id,
      user?.role,
      user?.isRestricted,
      user?.restrictedToSubcommunityId
    );
  }

  @Get("posts/:id")
  @Public()
  findOne(@Param("id") id: string, @CurrentUser() user?: PublicUser) {
    return this.postsService.findById(id, user?.id, user?.role);
  }

  @Patch("posts/:id")
  update(
    @Param("id") id: string,
    @Body() dto: UpdatePostDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.postsService.update(id, dto, user.id);
  }

  @Delete("posts/:id")
  delete(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.postsService.delete(id, user.id, user.role);
  }

  @Post("posts/:id/vote")
  vote(
    @Param("id") id: string,
    @Body() dto: VoteDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.postsService.vote(id, dto, user.id);
  }

  @Delete("posts/:id/vote")
  removeVote(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.postsService.removeVote(id, user.id);
  }

  @Get("posts/:id/votes")
  getVotes(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.postsService.getVotes(id, user.role);
  }
}
