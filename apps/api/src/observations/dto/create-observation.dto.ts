import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

class LocationDto {
  @ApiProperty({ example: 18.7883 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 98.9853 })
  @IsNumber()
  lng: number;
}

export class CreateObservationDto {
  @ApiProperty({ example: "uuid-farm-id" })
  @IsString()
  @IsNotEmpty()
  farm_id: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @ApiProperty({ example: "disease", enum: ["disease", "pest", "nutrient_deficiency", "irrigation", "weed", "general", "harvest_ready"] })
  @IsString()
  @IsNotEmpty()
  observation_type: string;

  @ApiPropertyOptional({ example: "medium", enum: ["low", "medium", "high", "critical"] })
  @IsString()
  @IsOptional()
  severity?: string;

  @ApiPropertyOptional({ example: "ใบมีจุดสีน้ำตาล" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @ApiPropertyOptional({ type: [String], description: "S3 keys from upload endpoint" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  image_keys?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  voice_note_key?: string;

  @ApiPropertyOptional({ description: "Client-side ISO timestamp (preserves offline timing)" })
  @IsDateString()
  @IsOptional()
  observed_at?: string;
}
