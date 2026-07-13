import { getProfiles, getUserStatistics } from '../../../services/profilesService';

export const loadUsersPageData = async () => {
  let serverStatistics = null;
  try {
    serverStatistics = await getUserStatistics({ quiet: true });
  } catch (error) {
    // Restricted aggregate reads fall back to statistics derived from visible profiles.
  }

  const users = await getProfiles({ quiet: true });
  const totalUsers = serverStatistics?.totalUsers || users.length;
  const roleDistribution = serverStatistics?.roleDistribution || users.reduce((distribution, user) => {
    const role = user.role || 'patient';
    distribution[role] = (distribution[role] || 0) + 1;
    return distribution;
  }, {});

  const statistics = serverStatistics?.totalUsers ? serverStatistics : {
    totalUsers,
    roleDistribution,
    emailVerifiedUsers: users.filter((user) => user.email_confirmed_at || user.bvn_verified).length,
    bvnVerifiedUsers: users.filter((user) => user.bvn_verified).length,
  };

  return { users, statistics };
};

export const createUsersFailureData = () => ({ users: [], statistics: null });
