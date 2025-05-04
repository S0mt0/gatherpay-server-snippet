import { InjectModel } from '@nestjs/sequelize';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Op, Order } from 'sequelize';

import { ParseGroupUrlQueryDto, UpdateGroupDto } from './dto';
import { Group, UserGroupMembership } from './models';
import { CacheService } from 'src/lib/services';
import { USER_GROUPS } from 'src/lib/services/cache/cache-keys';
import { generateCacheKeyFromQuery, paginate } from 'src/lib/utils';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group) private groupModel: typeof Group,
    @InjectModel(UserGroupMembership)
    private memberModel: typeof UserGroupMembership,
    private readonly cache: CacheService,
  ) {}

  async createGroup(dto: any, userId: string) {
    const transaction = await this.groupModel.sequelize.transaction();

    try {
      const group = await this.groupModel.create(
        { ...dto, ownerId: userId },
        { transaction },
      );

      await this.memberModel.create(
        {
          status: 'active',
          role: 'admin',
          memberId: userId,
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

  // async findAllMyGroups(userId: string) {
  //   let all_groups = await this.cache.get<Group[]>(USER_GROUPS(userId)); // Check if user's groups is in cache storage

  //   if (!all_groups) {
  //     // If not in cache storage, then query database for the fresh data
  //     all_groups = await this.groupModel.findAll({
  //       where: {
  //         [Op.or]: [{ ownerId: userId }],
  //       },
  //       include: [
  //         {
  //           model: UserGroupMembership,
  //           where: { memberId: userId },
  //           as: 'membership',
  //           required: false,
  //         },
  //       ],
  //       order: [['createdAt', 'DESC']],
  //     }); // This fetches all groups that were created by the user as well as groups a user belongs to

  //     // Save fresh data in cache storage for faster fetch in subsequent requests
  //     await this.cache.set(USER_GROUPS(userId), all_groups);
  //   }

  //   return { all_groups };
  // }

  async findAllMyGroups(userId: string, query: ParseGroupUrlQueryDto) {
    const cacheKey = generateCacheKeyFromQuery(USER_GROUPS(userId), query);

    const cached = await this.cache.get(cacheKey); // Check if user's groups is in cache storage

    if (cached) return cached;

    const { sort, fields, page, limit, name, payoutDay, status } = query;

    const where: any = {
      [Op.or]: [{ ownerId: userId }],
    };

    if (name !== undefined) where.name = { [Op.iLike]: `%${name}%` };
    if (payoutDay !== undefined) where.payoutDay = payoutDay;
    if (status !== undefined) where.status = status;

    const order: Order = sort
      ? [[sort.replace('-', ''), sort.startsWith('-') ? 'DESC' : 'ASC']]
      : [['createdAt', 'DESC']];

    const attributes = fields ? fields.split(',') : undefined;

    const { data: my_groups, pagination: metadata } = await paginate(
      this.groupModel,
      {
        page,
        limit,
        options: {
          where,
          include: [
            {
              model: UserGroupMembership,
              where: { memberId: userId },
              required: false,
            },
          ],
          attributes,
          order,
        },
      },
    ); // This fetches all groups that were created by the user as well as groups a user belongs to

    // Save fresh data in cache storage for faster fetch in subsequent requests
    await this.cache.set(cacheKey, { my_groups, metadata });

    return { my_groups, metadata };
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
