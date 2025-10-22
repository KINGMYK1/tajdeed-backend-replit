import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Address, Profile } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

const PROFILE_INCLUDE: Prisma.ProfileInclude = {
  addresses: {
    orderBy: { createdAt: 'desc' },
  },
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      status: true,
      createdAt: true,
    },
  },
};

type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof PROFILE_INCLUDE }>;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        createdAt: true,
        profile: {
          select: {
            id: true,
            avatarUrl: true,
            bio: true,
            location: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('Profil introuvable');
    }

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      profile: {
        id: user.profile.id,
        avatarUrl: user.profile.avatarUrl,
        bio: user.profile.bio,
        location: user.profile.location,
        createdAt: user.profile.createdAt,
        updatedAt: user.profile.updatedAt,
      },
    };
  }

  async getMyProfile(userId: string) {
    const profile = await this.loadProfile(userId);
    return this.mapOwnerProfile(profile);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const avatarUrl = this.normalizeNullableString(dto.avatarUrl);
    const bio = this.normalizeNullableString(dto.bio);
    const location = this.normalizeNullableString(dto.location);
    const preferences = this.normalizePreferences(dto.preferences);

    if (
      avatarUrl === undefined &&
      bio === undefined &&
      location === undefined &&
      preferences === undefined
    ) {
      return this.getMyProfile(userId);
    }

    const profile = await this.prisma.profile.upsert({
      where: { userId },
      update: {
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(preferences !== undefined ? { preferences } : {}),
      },
      create: {
        user: { connect: { id: userId } },
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        ...(bio !== undefined ? { bio } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(preferences !== undefined ? { preferences } : {}),
      },
      include: PROFILE_INCLUDE,
    });

    return this.mapOwnerProfile(profile);
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const profile = await this.ensureProfileRecord(userId);

    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId: profile.id },
          data: { isDefault: false },
        });
      }

      await tx.address.create({
        data: {
          profileId: profile.id,
          line1: this.requireNonEmpty(dto.line1),
          line2: this.normalizeNullableString(dto.line2) ?? null,
          city: this.requireNonEmpty(dto.city),
          country: this.requireNonEmpty(dto.country),
          zip: this.normalizeNullableString(dto.zip) ?? null,
          label: this.normalizeNullableString(dto.label) ?? null,
          isDefault: dto.isDefault ?? false,
        },
      });
    });

    return this.getMyProfile(userId);
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const profile = await this.ensureProfileRecord(userId);
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, profileId: profile.id },
    });

    if (!existing) {
      throw new NotFoundException('Adresse introuvable');
    }

    const line1 = this.normalizeNullableString(dto.line1);
    const city = this.normalizeNullableString(dto.city);
    const country = this.normalizeNullableString(dto.country);
    const updateData: Prisma.AddressUpdateInput = {
      ...(line1 !== undefined
        ? { line1: this.ensurePresent(line1, 'line1') }
        : {}),
      ...(city !== undefined ? { city: this.ensurePresent(city, 'city') } : {}),
      ...(country !== undefined
        ? { country: this.ensurePresent(country, 'country') }
        : {}),
      ...(dto.line2 !== undefined
        ? { line2: this.normalizeNullableString(dto.line2) ?? null }
        : {}),
      ...(dto.zip !== undefined
        ? { zip: this.normalizeNullableString(dto.zip) ?? null }
        : {}),
      ...(dto.label !== undefined
        ? { label: this.normalizeNullableString(dto.label) ?? null }
        : {}),
      ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
    };

    if (Object.keys(updateData).length === 0) {
      return this.getMyProfile(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { profileId: profile.id },
          data: { isDefault: false },
        });
      }

      await tx.address.update({
        where: { id: existing.id },
        data: updateData,
      });
    });

    return this.getMyProfile(userId);
  }

  async deleteAddress(userId: string, addressId: string) {
    const profile = await this.ensureProfileRecord(userId);
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, profileId: profile.id },
    });

    if (!existing) {
      throw new NotFoundException('Adresse introuvable');
    }

    await this.prisma.address.delete({ where: { id: existing.id } });
    return this.getMyProfile(userId);
  }

  private async loadProfile(userId: string): Promise<ProfileWithRelations> {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: PROFILE_INCLUDE,
    });

    if (profile) {
      return profile;
    }

    return this.prisma.profile.create({
      data: { user: { connect: { id: userId } } },
      include: PROFILE_INCLUDE,
    });
  }

  private async ensureProfileRecord(userId: string): Promise<Profile> {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (profile) {
      return profile;
    }
    return this.prisma.profile.create({ data: { user: { connect: { id: userId } } } });
  }

  private mapOwnerProfile(profile: ProfileWithRelations) {
    return {
      id: profile.id,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      location: profile.location,
      preferences: profile.preferences,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      user: {
        id: profile.user.id,
        email: profile.user.email,
        username: profile.user.username,
        role: profile.user.role,
        status: profile.user.status,
        createdAt: profile.user.createdAt,
      },
      addresses: profile.addresses.map((address) => this.mapAddress(address)),
    };
  }

  private mapAddress(address: Address) {
    return {
      id: address.id,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      country: address.country,
      zip: address.zip,
      label: address.label,
      isDefault: address.isDefault,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private normalizeNullableString(value?: string | null): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizePreferences(value?: Record<string, any> | null) {
    if (typeof value === 'undefined') {
      return undefined;
    }
    return value === null ? null : value;
  }

  private requireNonEmpty(value: string) {
    const trimmed = value.trim();
    if (!trimmed.length) {
      throw new BadRequestException('Les champs obligatoires ne peuvent pas être vides');
    }
    return trimmed;
  }

  private ensurePresent(value: string | null, field: string) {
    if (value === null) {
      throw new BadRequestException(`${field} ne peut pas être vide`);
    }
    return value;
  }
}
