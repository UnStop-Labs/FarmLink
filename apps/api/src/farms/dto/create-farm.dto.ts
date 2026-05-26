import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateFarmDto {
  @ApiProperty({ example: "ไร่ข้าวหนองแซง" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: "rice" })
  @IsString()
  @IsNotEmpty()
  crop_type: string;

  @ApiPropertyOptional({ example: "เชียงใหม่" })
  @IsString()
  @IsOptional()
  province?: string;

  @ApiPropertyOptional({ example: 5.5, description: "Farm size in Rai (Thai unit, 1 rai = 1600 m²)" })
  @IsNumber()
  @Min(0)
  @IsOptional()
  area_rai?: number;

  @ApiPropertyOptional({
    example: {
      type: "Polygon",
      coordinates: [[[100.5, 18.7], [100.51, 18.7], [100.51, 18.71], [100.5, 18.71], [100.5, 18.7]]],
    },
  })
  @IsObject()
  @IsOptional()
  polygon?: { type: "Polygon"; coordinates: [number, number][][] };

  @ApiPropertyOptional({ example: "U1234567890abcdef" })
  @IsString()
  @IsOptional()
  line_user_id?: string;
}
