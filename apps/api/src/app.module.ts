import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FarmsModule } from "./farms/farms.module";
import { ObservationsModule } from "./observations/observations.module";
import { SatelliteModule } from "./satellite/satellite.module";
import { HarvestsModule } from "./harvests/harvests.module";
import { SyncModule } from "./sync/sync.module";
import { UploadModule } from "./upload/upload.module";
import { AuthModule } from "./auth/auth.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ["../../.env", ".env"],
    }),
    AuthModule,
    FarmsModule,
    ObservationsModule,
    SatelliteModule,
    HarvestsModule,
    SyncModule,
    UploadModule,
  ],
})
export class AppModule {}
