import { Module } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { LineModule } from "../line/line.module";

@Module({
  imports: [LineModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
