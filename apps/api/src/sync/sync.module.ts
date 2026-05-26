import { Module } from "@nestjs/common";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { ObservationsModule } from "../observations/observations.module";
import { HarvestsModule } from "../harvests/harvests.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule, ObservationsModule, HarvestsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
