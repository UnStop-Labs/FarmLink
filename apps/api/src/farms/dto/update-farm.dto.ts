import { IsString, IsOptional, IsNumber, IsObject, Min, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateFarmDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  area_rai?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  polygon?: { type: "Polygon"; coordinates: [number, number][][] };
}
