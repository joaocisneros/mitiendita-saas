import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryService } from './inventory.service';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class AdjustStockDto {
  @IsUUID()
  productId!: string;

  @IsIn(['entry', 'adjustment', 'return'])
  type!: 'entry' | 'adjustment' | 'return';

  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

class VariantQuantityDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  color?: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

class AdjustVariantsDto {
  @IsUUID()
  productId!: string;

  @IsIn(['entry', 'adjustment'])
  type!: 'entry' | 'adjustment';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityDto)
  rows!: VariantQuantityDto[];
}

class SplitVariantsDto {
  @IsUUID()
  productId!: string;

  @IsString()
  @MaxLength(20)
  productType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reason?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(300)
  @ValidateNested({ each: true })
  @Type(() => VariantQuantityDto)
  rows!: VariantQuantityDto[];
}

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('products')
  products(@CurrentUser('companyId') companyId: string) {
    return this.inventory.products(companyId);
  }

  /** Pedidos pagados por confirmar que apartan stock. */
  @Get('reservations')
  reservations(@CurrentUser('companyId') companyId: string) {
    return this.inventory.unpaidReservations(companyId);
  }

  @Get('movements')
  movements(
    @CurrentUser('companyId') companyId: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('channel') channel?: string,
  ) {
    return this.inventory.movements(companyId, {
      productId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      channel,
    });
  }

  @Post('adjust')
  adjust(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.inventory.adjust(companyId, userId, dto);
  }

  /** Mercadería por talla/color (suma o corrige y agrega opciones nuevas). */
  @Post('adjust-variants')
  adjustVariants(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: AdjustVariantsDto,
  ) {
    return this.inventory.adjustVariants(companyId, userId, dto);
  }

  /** Pone tallas o colores a un producto que no los tenía (mismo producto). */
  @Post('split-variants')
  splitVariants(
    @CurrentUser('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: SplitVariantsDto,
  ) {
    return this.inventory.splitVariants(companyId, userId, dto);
  }
}
