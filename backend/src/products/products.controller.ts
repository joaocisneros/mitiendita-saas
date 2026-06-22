import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Roles('OWNER', 'EMPLOYEE')
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.products.create(companyId, dto);
  }

  @Get()
  findAll(
    @CurrentUser('companyId') companyId: string,
    @Query() query: QueryProductsDto,
  ) {
    return this.products.findAll(companyId, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.products.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.products.remove(companyId, id);
  }
}
