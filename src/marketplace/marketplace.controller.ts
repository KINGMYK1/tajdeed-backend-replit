import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  // Items endpoints
  @UseGuards(AuthGuard)
  @Post('items')
  createItem(@Request() req, @Body() createItemDto: CreateItemDto) {
    return this.marketplaceService.createItem(req.user.id, createItemDto);
  }

  @Public()
  @Get('items')
  findAllItems() {
    return this.marketplaceService.findAllItems();
  }

  @Public()
  @Get('items/:id')
  findItemById(@Param('id') id: string) {
    return this.marketplaceService.findItemById(id);
  }

  @UseGuards(AuthGuard)
  @Put('items/:id')
  updateItem(
    @Request() req,
    @Param('id') id: string,
    @Body() updateItemDto: UpdateItemDto,
  ) {
    // TODO: Add authorization check to ensure user owns the item
    return this.marketplaceService.updateItem(id, updateItemDto);
  }

  @UseGuards(AuthGuard)
  @Delete('items/:id')
  deleteItem(@Request() req, @Param('id') id: string) {
    // TODO: Add authorization check to ensure user owns the item
    return this.marketplaceService.deleteItem(id);
  }

  // Categories endpoints
  @UseGuards(AuthGuard)
  @Post('categories')
  createCategory(@Body() createCategoryDto: CreateCategoryDto) {
    // TODO: Add admin guard to restrict category creation
    return this.marketplaceService.createCategory(createCategoryDto);
  }

  @Public()
  @Get('categories')
  findAllCategories() {
    return this.marketplaceService.findAllCategories();
  }

  @Public()
  @Get('categories/:id')
  findCategoryById(@Param('id') id: string) {
    return this.marketplaceService.findCategoryById(id);
  }
}