import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards
} from "@nestjs/common";
import { BotService } from "./bot.service";
import { CreateBotThreadDto, CreateBotPostDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { BotGuard } from "./guards/bot.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { PublicUser } from "../auth/auth.types";

@Controller("bot")
@UseGuards(JwtAuthGuard, BotGuard)
export class BotController {
  constructor(private readonly botService: BotService) {}

  /**
   * Create a new thread as a bot
   * POST /bot/threads
   */
  @Post("threads")
  createThread(
    @Body() dto: CreateBotThreadDto,
    @CurrentUser() bot: PublicUser
  ) {
    return this.botService.createThread(dto, bot.id);
  }

  /**
   * Create a new post/reply as a bot
   * POST /bot/posts
   */
  @Post("posts")
  createPost(
    @Body() dto: CreateBotPostDto,
    @CurrentUser() bot: PublicUser
  ) {
    return this.botService.createPost(dto, bot.id);
  }

  /**
   * Get bot's posting statistics
   * GET /bot/stats
   */
  @Get("stats")
  getBotStats(@CurrentUser() bot: PublicUser) {
    return this.botService.getBotStats(bot.id);
  }
}
