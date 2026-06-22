import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * CRUD de categorías del panel. Siempre acotado a la empresa del token.
 */
@Roles('OWNER', 'EMPLOYEE')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  create(
    @CurrentUser('companyId') companyId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categories.create(companyId, dto);
  }

  @Get()
  findAll(@CurrentUser('companyId') companyId: string) {
    return this.categories.findAll(companyId);
  }

  @Get(':id')
  findOne(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.categories.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categories.update(companyId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.categories.remove(companyId, id);
  }
}
