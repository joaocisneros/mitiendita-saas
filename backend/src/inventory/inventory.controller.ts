import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
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

@Roles('OWNER', 'EMPLOYEE')
@Controller('admin/inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('products')
  products(@CurrentUser('companyId') companyId: string) {
    return this.inventory.products(companyId);
  }

  @Get('movements')
  movements(
    @CurrentUser('companyId') companyId: string,
    @Query('productId') productId?: string,
    @Query('page') page?: string,
  ) {
    return this.inventory.movements(companyId, {
      productId,
      page: page ? Number(page) : undefined,
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
}
