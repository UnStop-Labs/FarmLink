import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { HarvestsService } from "./harvests.service";
import { CreateHarvestDto } from "./dto/create-harvest.dto";

@ApiTags("Harvests")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/harvests")
export class HarvestsController {
  constructor(private readonly harvestsService: HarvestsService) {}

  @Get("farm/:farmId")
  @ApiOperation({ summary: "List all harvest logs for a farm" })
  async findByFarm(@Param("farmId") farmId: string) {
    return this.harvestsService.findByFarm(farmId);
  }

  @Get("farm/:farmId/stats")
  @ApiOperation({ summary: "Yield statistics and analytics" })
  async getStats(@Param("farmId") farmId: string) {
    return this.harvestsService.getYieldStats(farmId);
  }

  @Post()
  @ApiOperation({ summary: "Log a new harvest" })
  async create(@Body() dto: CreateHarvestDto) {
    return this.harvestsService.create(dto);
  }
}
