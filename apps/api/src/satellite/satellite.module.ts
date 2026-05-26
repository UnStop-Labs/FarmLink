import { Module } from "@nestjs/common";
import { SatelliteController } from "./satellite.controller";
import { SatelliteService } from "./satellite.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [SatelliteController],
  providers: [SatelliteService],
  exports: [SatelliteService],
})
export class SatelliteModule {}
