// @ts-nocheck
const ROLE_ROUTES = {
  Admin: '/admin',
  Moderator: '/admin/moderator',
  'Call Team': '/admin/call-team',
  'Courier Team': '/admin/courier',
  'Factory Team': '/admin/factory',
  'Digital Marketer': '/admin/digital-marketer',
};

export const getRoleRoute = (roles = []) => {
  const priority = ['Admin', 'Digital Marketer', 'Moderator', 'Call Team', 'Courier Team', 'Factory Team'];

  for (const role of priority) {
    if (roles.includes(role)) {
      return ROLE_ROUTES[role];
    }
  }

  return '/admin';
};
