import { Module } from "@nestjs/common";
import { SubcommunitiesController } from "./subcommunities.controller";
import { SubcommunitiesService } from "./subcommunities.service";
import { PrismaModule } from "../database/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [SubcommunitiesController],
  providers: [SubcommunitiesService],
  exports: [SubcommunitiesService]
})
export class SubcommunitiesModule {}
