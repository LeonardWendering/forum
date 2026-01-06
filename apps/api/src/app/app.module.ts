import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { validateEnv } from "../config/env.validation";
import { PrismaModule } from "../database/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ProfileModule } from "../profile/profile.module";
import { SubcommunitiesModule } from "../subcommunities/subcommunities.module";
import { ThreadsModule } from "../threads/threads.module";
import { PostsModule } from "../posts/posts.module";
import { MessagesModule } from "../messages/messages.module";
import { AdminModule } from "../admin/admin.module";
import { BotModule } from "../bot/bot.module";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AppService } from "./app.service";
import { AppController } from "./app.controller";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ["apps/api/.env", ".env"],
      validate: validateEnv
    }),
    PrismaModule,
    AuthModule,
    ProfileModule,
    SubcommunitiesModule,
    ThreadsModule,
    PostsModule,
    MessagesModule,
    AdminModule,
    BotModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule {}
