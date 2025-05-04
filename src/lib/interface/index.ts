import { FindAndCountOptions } from 'sequelize';

export type Minutes =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26
  | 27
  | 28
  | 29
  | 30
  | 31
  | 32
  | 33
  | 34
  | 35
  | 36
  | 37
  | 38
  | 39
  | 40
  | 41
  | 42
  | 43
  | 44
  | 45
  | 46
  | 47
  | 48
  | 49
  | 50
  | 51
  | 52
  | 53
  | 54
  | 55
  | 56
  | 57
  | 58
  | 59;

export type Hours =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24;

export type Days = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TimeInMilliseconds<T extends string | number | symbol> = {
  [key in T]: number;
};

export interface PaginateOptions {
  page?: number;
  limit?: number;
  defaultLimit?: number;
  maxLimit?: number;
  options?: FindAndCountOptions;
}

export interface IDeviceInfo {
  ip: string;
  device: string;
  userAgent: string;
}

export type AllowedProviders =
  | 'credentials'
  | 'google.com'
  | 'facebook.com'
  | 'apple.com';

export type TRole = 'x-admin' | 'user';

export type TGroupRole = 'admin' | 'member';

export type TGroupPayoutOrder = 'random' | 'first-come-first-serve';

export type TGroupStatus = 'pending' | 'active' | 'completed' | 'cancelled';

export type TGroupPayoutDay =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type TGroupFrequency =
  | 'daily'
  | 'weekly'
  | 'bi-weekly'
  | 'monthly'
  | 'custom';

export interface TGroupCustomFrequency {
  step: number;
  unit: 'days' | 'weeks' | 'months' | 'years';
}

export type TGroupMembershipStatus = 'pending' | 'active' | 'suspended';

export type TGroupCycleStatus = 'pending' | 'completed' | 'delayed';

export type TGroupUserContributionStatus =
  | 'paid'
  | 'not_paid'
  | 'not_confirmed'
  | 'defaulted';

export type TGroupUserDefaultReason =
  | 'missed_contribution'
  | 'delayed_contribution'
  | 'disappeared_after_payout';
