const freezeArray = (values) => Object.freeze([...values]);

export const ROLES = Object.freeze({
  ADMIN: "admin",
  STAFF: "staff",
  VIEWER: "viewer",
});

export const INTERNAL_USER_ROLES = freezeArray(Object.values(ROLES));

export const POLICY_SCOPES = Object.freeze({
  USERS_READ: "users:read",
  USERS_MANAGE: "users:manage",
  OPERATIONS_READ: "operations:read",
  OPERATIONS_WRITE: "operations:write",
  FINANCE_READ: "finance:read",
  FINANCE_WRITE: "finance:write",
  ANALYTICS_READ: "analytics:read",
  AI_READ: "ai:read",
});

export const ROLE_SCOPES = Object.freeze({
  [ROLES.ADMIN]: freezeArray(Object.values(POLICY_SCOPES)),
  [ROLES.STAFF]: freezeArray([
    POLICY_SCOPES.USERS_READ,
    POLICY_SCOPES.OPERATIONS_READ,
    POLICY_SCOPES.OPERATIONS_WRITE,
    POLICY_SCOPES.FINANCE_READ,
    POLICY_SCOPES.FINANCE_WRITE,
    POLICY_SCOPES.ANALYTICS_READ,
    POLICY_SCOPES.AI_READ,
  ]),
  [ROLES.VIEWER]: freezeArray([
    POLICY_SCOPES.OPERATIONS_READ,
    POLICY_SCOPES.FINANCE_READ,
    POLICY_SCOPES.ANALYTICS_READ,
    POLICY_SCOPES.AI_READ,
  ]),
});

export const ROLE_ACCESS = Object.freeze({
  ADMIN_ONLY: freezeArray([ROLES.ADMIN]),
  STAFF_WRITE: freezeArray([ROLES.ADMIN, ROLES.STAFF]),
  INTERNAL_READ: freezeArray([ROLES.ADMIN, ROLES.STAFF, ROLES.VIEWER]),
});

const flattenRoles = (roles) => roles.flat(Infinity);

export const normalizeRole = (role) => {
  if (typeof role !== "string") return null;
  return role.trim().toLowerCase();
};

export const isInternalUserRole = (role) =>
  INTERNAL_USER_ROLES.includes(normalizeRole(role));

export const normalizePolicyRoles = (roles) =>
  freezeArray(
    [...new Set(flattenRoles(roles).map(normalizeRole).filter(isInternalUserRole))]
  );

export const getUnsupportedPolicyRoles = (roles) =>
  freezeArray(
    [
      ...new Set(
        flattenRoles(roles)
          .map(normalizeRole)
          .filter((role) => role && !isInternalUserRole(role))
      ),
    ]
  );

export const getRoleScopes = (role) => ROLE_SCOPES[normalizeRole(role)] ?? freezeArray([]);

export const roleHasScope = (role, scope) => getRoleScopes(role).includes(scope);
