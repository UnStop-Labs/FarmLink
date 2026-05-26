import { Module } from "@nestjs/common";
import { HarvestsController } from "./harvests.controller";
import { HarvestsService } from "./harvests.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [HarvestsController],
  providers: [HarvestsService],
  exports: [HarvestsService],
})
export class HarvestsModule {}
