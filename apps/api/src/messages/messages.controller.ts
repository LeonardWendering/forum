import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards
} from "@nestjs/common";
import { MessagesService } from "./messages.service";
import { CreateConversationDto, SendMessageDto } from "./dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { PublicUser } from "../auth/auth.types";

@Controller("conversations")
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  createConversation(
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.messagesService.createConversation(dto, user.id);
  }

  @Get()
  getConversations(@CurrentUser() user: PublicUser) {
    return this.messagesService.getConversations(user.id);
  }

  @Get("unread")
  getUnreadCount(@CurrentUser() user: PublicUser) {
    return this.messagesService.getUnreadCount(user.id);
  }

  @Get(":id")
  getConversation(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.messagesService.getConversation(id, user.id);
  }

  @Get(":id/messages")
  getMessages(
    @Param("id") id: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @CurrentUser() user?: PublicUser
  ) {
    return this.messagesService.getMessages(
      id,
      user!.id,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50
    );
  }

  @Post(":id/messages")
  sendMessage(
    @Param("id") id: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: PublicUser
  ) {
    return this.messagesService.sendMessage(id, dto, user.id);
  }

  @Patch(":id/read")
  markAsRead(@Param("id") id: string, @CurrentUser() user: PublicUser) {
    return this.messagesService.markAsRead(id, user.id);
  }
}
