import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  async createItem(userId: string, createItemDto: CreateItemDto) {
    const { categoryId, ...itemData } = createItemDto;
    
    return this.prisma.item.create({
      data: {
        ...itemData,
        seller: {
          connect: { id: userId }
        },
        category: {
          connect: { id: categoryId }
        },
        status: 'AVAILABLE'
      },
      include: {
        category: true,
        seller: true
      }
    });
  }

  async findAllItems() {
    return this.prisma.item.findMany({
      where: {
        status: 'AVAILABLE'
      },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true
          }
        },
        images: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  async findItemById(id: string) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true
          }
        },
        images: true
      }
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    return item;
  }

  async updateItem(id: string, userId: string, updateItemDto: UpdateItemDto) {
    const { categoryId, ...itemData } = updateItemDto;

    const item = await this.findItemById(id);

    if (item.seller.id !== userId) {
      throw new UnauthorizedException('You are not authorized to update this item');
    }

    const updateData: any = { ...itemData };

    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      };
    }

    return this.prisma.item.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        seller: true,
        images: true,
      },
    });
  }

  async deleteItem(id: string) {
    // Check if item exists
    await this.findItemById(id);
    
    // We soft delete by changing status to REMOVED
    return this.prisma.item.update({
      where: { id },
      data: { status: 'SOLD' },
      include: {
        category: true,
        seller: true
      }
    });
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto
    });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      orderBy: {
        name: 'asc'
      }
    });
  }

  async findCategoryById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        items: {
          where: {
            status: 'AVAILABLE'
          },
          include: {
            images: true,
            seller: {
              select: {
                id: true,
                name: true,
                username: true
              }
            }
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }
}