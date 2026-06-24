import { Controller, Get, Param, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * API pública de la tienda (la consume el catálogo que ven los compradores).
 * Todo es @Public(): sin login.
 */
@Public()
@Controller('public/stores')
export class StorefrontController {
  constructor(private readonly storefront: StorefrontService) {}

  @Get(':subdomain')
  getStore(@Param('subdomain') subdomain: string) {
    return this.storefront.getStore(subdomain);
  }

  @Get(':subdomain/products')
  listProducts(
    @Param('subdomain') subdomain: string,
    @Query('category') categorySlug?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    return this.storefront.listProducts(subdomain, {
      categorySlug,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sort,
    });
  }

  @Get(':subdomain/products/:slug')
  getProduct(
    @Param('subdomain') subdomain: string,
    @Param('slug') slug: string,
  ) {
    return this.storefront.getProduct(subdomain, slug);
  }
}
