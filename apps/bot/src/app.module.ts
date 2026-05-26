import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { LineModule } from "./line/line.module";
import { NotificationsModule } from "./notifications/notifications.module";
import configuration from "./config/configuration";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ["../../.env", ".env"],
    }),
    ScheduleModule.forRoot(),
    LineModule,
    NotificationsModule,
  ],
})
export class AppModule {}
