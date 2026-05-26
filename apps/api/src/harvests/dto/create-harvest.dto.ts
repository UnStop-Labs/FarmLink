import { IsString, IsOptional, IsNumber, IsDateString, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateHarvestDto {
  @ApiProperty({ example: "uuid-farm-id" })
  @IsString()
  farm_id: string;

  @ApiProperty({ example: "2024-11-15" })
  @IsDateString()
  harvest_date: string;

  @ApiPropertyOptional({ example: "rice" })
  @IsString()
  @IsOptional()
  crop_type?: string;

  @ApiPropertyOptional({ example: 3200, description: "Estimated yield in kg" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimated_yield_kg?: number;

  @ApiPropertyOptional({ example: 3050, description: "Actual yield in kg" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  actual_yield_kg?: number;

  @ApiPropertyOptional({ example: "เกรด A" })
  @IsString()
  @IsOptional()
  quality_notes?: string;

  @ApiPropertyOptional({ example: 12.5, description: "Price per kg in THB" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price_per_kg?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
