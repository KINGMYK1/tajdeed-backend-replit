import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    emailVerified: boolean;
  };
}

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @UseGuards(AuthGuard)
  @Get('me')
  async getMyProfile(@Req() req: AuthenticatedRequest) {
    return this.profilesService.getMyProfile(req.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('me')
  async updateMyProfile(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) {
    return this.profilesService.updateProfile(req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Post('me/addresses')
  async createAddress(@Req() req: AuthenticatedRequest, @Body() dto: CreateAddressDto) {
    return this.profilesService.createAddress(req.user.id, dto);
  }

  @UseGuards(AuthGuard)
  @Patch('me/addresses/:addressId')
  async updateAddress(
    @Req() req: AuthenticatedRequest,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.profilesService.updateAddress(req.user.id, addressId, dto);
  }

  @UseGuards(AuthGuard)
  @Delete('me/addresses/:addressId')
  async deleteAddress(@Req() req: AuthenticatedRequest, @Param('addressId') addressId: string) {
    return this.profilesService.deleteAddress(req.user.id, addressId);
  }

  @Public()
  @Get(':userId')
  async getPublicProfile(@Param('userId') userId: string) {
    return this.profilesService.getPublicProfile(userId);
  }
}
