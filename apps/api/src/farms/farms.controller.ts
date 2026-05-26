import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from "@nestjs/swagger";
import { Request } from "express";
import { AuthGuard } from "../auth/auth.guard";
import { FarmsService } from "./farms.service";
import { CreateFarmDto } from "./dto/create-farm.dto";
import { UpdateFarmDto } from "./dto/update-farm.dto";

@ApiTags("Farms")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("api/farms")
export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  @Get()
  @ApiOperation({ summary: "List all farms for the authenticated user" })
  async findAll(@Req() req: Request) {
    return this.farmsService.findAll(req.user!.id);
  }

  @Get("bbox")
  @ApiOperation({ summary: "Get farms within a map bounding box" })
  @ApiQuery({ name: "minLng", type: Number })
  @ApiQuery({ name: "minLat", type: Number })
  @ApiQuery({ name: "maxLng", type: Number })
  @ApiQuery({ name: "maxLat", type: Number })
  async findInBbox(
    @Query("minLng") minLng: string,
    @Query("minLat") minLat: string,
    @Query("maxLng") maxLng: string,
    @Query("maxLat") maxLat: string
  ) {
    return this.farmsService.findInBbox(
      parseFloat(minLng),
      parseFloat(minLat),
      parseFloat(maxLng),
      parseFloat(maxLat)
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single farm with latest satellite snapshot" })
  async findOne(@Param("id") id: string, @Req() req: Request) {
    return this.farmsService.findOne(id, req.user!.id);
  }

  @Get(":id/health")
  @ApiOperation({ summary: "Get farm health summary (NDVI, anomalies, observations)" })
  async getHealth(@Param("id") id: string) {
    return this.farmsService.getHealthSummary(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new farm" })
  async create(@Body() dto: CreateFarmDto, @Req() req: Request) {
    return this.farmsService.create(req.user!.id, dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update farm details or boundary" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateFarmDto,
    @Req() req: Request
  ) {
    return this.farmsService.update(id, req.user!.id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Soft-delete a farm" })
  async remove(@Param("id") id: string, @Req() req: Request) {
    return this.farmsService.remove(id, req.user!.id);
  }
}
