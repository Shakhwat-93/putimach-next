// @ts-nocheck
const ROLE_ROUTES = {
  Admin: '/ahasan',
  Moderator: '/ahasan/moderator',
  'Call Team': '/ahasan/call-team',
  'Courier Team': '/ahasan/courier',
  'Factory Team': '/ahasan/factory',
  'Digital Marketer': '/ahasan/digital-marketer',
};

export const getRoleRoute = (roles = []) => {
  const priority = ['Admin', 'Digital Marketer', 'Moderator', 'Call Team', 'Courier Team', 'Factory Team'];

  for (const role of priority) {
    if (roles.includes(role)) {
      return ROLE_ROUTES[role];
    }
  }

  return '/ahasan';
};
