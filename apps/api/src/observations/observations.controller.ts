import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { AuthGuard } from "../auth/auth.guard";
import { ObservationsService } from "./observations.service";
import { CreateObservationDto } from "./dto/create-observation.dto";

@ApiTags("Observations")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/observations")
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  @Get("farm/:farmId")
  @ApiOperation({ summary: "List observations for a farm" })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "offset", required: false })
  async findByFarm(
    @Param("farmId") farmId: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query("offset", new DefaultValuePipe(0), ParseIntPipe) offset: number
  ) {
    return this.observationsService.findByFarm(farmId, limit, offset);
  }

  @Post()
  @ApiOperation({ summary: "Create a single observation (online mode)" })
  async create(@Body() dto: CreateObservationDto) {
    return this.observationsService.create(dto);
  }
}
