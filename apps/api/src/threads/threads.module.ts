import { Module } from "@nestjs/common";
import { ThreadsController } from "./threads.controller";
import { ThreadsService } from "./threads.service";
import { PrismaModule } from "../database/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [ThreadsController],
  providers: [ThreadsService],
  exports: [ThreadsService]
})
export class ThreadsModule {}
