import { InjectModel } from '@nestjs/sequelize';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Op } from 'sequelize';

import {
  CreateGroupDto,
  GroupNameSearchDto,
  ParseGroupUrlQueryDto,
  UpdateGroupDto,
} from './dto';
import { Group, UserGroupMembership } from './models';
import { CacheService } from 'src/lib/services';
import { USER_GROUPS } from 'src/lib/services/cache/cache-keys';
import { generateCacheKeyFromQuery, paginate } from 'src/lib/utils';
import { User } from 'src/users/models';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group) private groupModel: typeof Group,
    @InjectModel(UserGroupMembership)
    private memberModel: typeof UserGroupMembership,
    private readonly cache: CacheService,
  ) {}

  async createGroup(dto: CreateGroupDto, user: User) {
    if (!dto.defaultCurrency && !user.defaultBankDetail)
      throw new BadRequestException(
        'Please setup your bank details or provide a default currency for this group transactions.',
      );

    const transaction = await this.groupModel.sequelize.transaction();

    try {
      const group = await this.groupModel.create(
        {
          ...dto,
          ownerId: user.id,
          openSlots: dto.targetMemberCount - 1,
          defaultCurrency:
            dto.defaultCurrency || user.defaultBankDetail.defaultCurrency,
        },
        { transaction },
      );

      await this.memberModel.create(
        {
          status: 'active',
          role: 'admin',
          memberId: user.id,
          groupId: group.id,
          memberSince: new Date(),
          payoutOrder: group.targetMemberCount, // Admin should be the last to receive payout; this helps reduce fraud
        },
        { transaction },
      );

      await transaction.commit();

      return { group };
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }

  async findAllMyGroups(userId: string, query: ParseGroupUrlQueryDto) {
    const cacheKey = generateCacheKeyFromQuery(USER_GROUPS(userId), query);

    const cached = await this.cache.get(cacheKey); // Check if user's groups is in cache storage

    if (cached) return cached;

    const { role, page, limit } = query;

    const where: Record<string, string> = {
      memberId: userId,
      status: 'active',
    };
    if (role !== undefined) where.role = role;

    const { data: my_groups, pagination: metadata } = await paginate(
      this.memberModel,
      {
        page,
        limit,
        options: {
          where,
          include: [
            {
              model: this.groupModel,
              as: 'groupInfo',
              include: [
                {
                  model: User.scope('profile'),
                  as: 'owner',
                },
              ],
            },
          ],
          attributes: { exclude: ['payoutOrder', 'status'] },
          order: [['memberSince', 'DESC']],
        },
      },
    ); // Fetch all groups where the current user is a member

    // Save fresh data in cache storage for faster fetch in subsequent requests
    await this.cache.set(cacheKey, { my_groups, metadata });

    return { my_groups, metadata };
  }

  async searchPublicGroups({ name }: GroupNameSearchDto) {
    return await this.groupModel.scope('public').findAll({
      where: { name: { [Op.iLike]: `%${name.trim()}%` }, isPublic: true },
      limit: 20,
    });
  }

  async findOne(userId: string, groupId: string) {
    const group = await this.groupModel.findOne({
      where: { id: groupId, ownerId: userId },
    });

    if (!group) throw new NotFoundException();

    return { group };
  }

  update(id: number, updateGroupDto: UpdateGroupDto) {
    console.log({ updateGroupDto });
    return `This action updates a #${id} group`;
  }

  remove(id: number) {
    return `This action removes a #${id} group`;
  }
}
