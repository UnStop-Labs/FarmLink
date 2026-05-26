import { Module } from "@nestjs/common";
import { FarmsController } from "./farms.controller";
import { FarmsService } from "./farms.service";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [AuthModule],
  controllers: [FarmsController],
  providers: [FarmsService],
  exports: [FarmsService],
})
export class FarmsModule {}
