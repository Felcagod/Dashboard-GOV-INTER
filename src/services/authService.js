const STORAGE_USERS_KEY = 'govc4-users';
const STORAGE_RESET_KEY = 'govc4-reset-codes';

const DEFAULT_USERS = {
  wagner: {
    username: 'wagner',
    name: 'Wagner',
    email: 'wagner@carrefour.com',
    role: 'Administrador',
    password: 'govc4*',
    picture: '',
    lastLogin: null,
  },
  enrique: {
    username: 'enrique',
    name: 'Enrique',
    email: 'enrique@carrefour.com',
    role: 'Gestor',
    password: 'govc4*',
    picture: '',
    lastLogin: null,
  },
  kelvyn: {
    username: 'kelvyn',
    name: 'Kelvyn',
    email: 'kelvyn@carrefour.com',
    role: 'Fiscal',
    password: 'govc4*',
    picture: '',
    lastLogin: null,
  },
  roberta: {
    username: 'roberta',
    name: 'Roberta',
    email: 'roberta@carrefour.com',
    role: 'Auditoria',
    password: 'govc4*',
    picture: '',
    lastLogin: null,
  },
  admin: {
    username: 'admin',
    name: 'Admin',
    email: 'admin@carrefour.com',
    role: 'Administrador',
    password: 'admin',
    picture: '',
    lastLogin: null,
  },
};

const normalize = (value) => value?.trim().toLowerCase();

const loadStoredUsers = () => {
  try {
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erro ao ler usuários do storage', error);
    return {};
  }
};

const saveStoredUsers = (users) => {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Erro ao salvar usuários no storage', error);
  }
};

const getAllUsers = () => {
  const customUsers = loadStoredUsers();
  return {
    ...DEFAULT_USERS,
    ...customUsers,
  };
};

const getUser = (username) => {
  if (!username) return null;
  const key = normalize(username);
  const users = getAllUsers();
  return users[key] || null;
};

const getPublicUser = (user) => {
  if (!user) return null;
  return {
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    picture: user.picture || '',
    lastLogin: user.lastLogin,
  };
};

export const authenticate = (username, password) => {
  const user = getUser(username);
  if (!user || user.password !== password) {
    return null;
  }
  return getPublicUser(user);
};

export const recordLogin = (username) => {
  const key = normalize(username);
  const user = getUser(key);
  if (!user) return null;
  const nextUsers = {
    ...loadStoredUsers(),
  };
  const updated = {
    ...user,
    lastLogin: new Date().toLocaleString('pt-BR'),
  };
  nextUsers[key] = updated;
  saveStoredUsers(nextUsers);
  return getPublicUser(updated);
};

const loadResetCodes = () => {
  try {
    const stored = localStorage.getItem(STORAGE_RESET_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Erro ao ler códigos de reset', error);
    return {};
  }
};

const saveResetCodes = (codes) => {
  try {
    localStorage.setItem(STORAGE_RESET_KEY, JSON.stringify(codes));
  } catch (error) {
    console.error('Erro ao salvar códigos de reset', error);
  }
};

export const startPasswordReset = (username) => {
  const user = getUser(username);
  if (!user) return null;
  const key = normalize(username);
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const resetCodes = loadResetCodes();
  resetCodes[key] = {
    code,
    expiresAt: Date.now() + 1000 * 60 * 15,
  };
  saveResetCodes(resetCodes);
  return code;
};

export const verifyPasswordResetCode = (username, code) => {
  const key = normalize(username);
  const resetCodes = loadResetCodes();
  const entry = resetCodes[key];
  if (!entry) return false;
  if (entry.code !== code) return false;
  if (Date.now() > entry.expiresAt) {
    delete resetCodes[key];
    saveResetCodes(resetCodes);
    return false;
  }
  return true;
};

export const completePasswordReset = (username, code, newPassword) => {
  if (!verifyPasswordResetCode(username, code)) return false;
  const key = normalize(username);
  const user = getUser(key);
  if (!user) return false;
  const stored = loadStoredUsers();
  stored[key] = {
    ...user,
    password: newPassword,
  };
  saveStoredUsers(stored);
  const resetCodes = loadResetCodes();
  delete resetCodes[key];
  saveResetCodes(resetCodes);
  return true;
};

export const updateProfile = (username, updates) => {
  const key = normalize(username);
  const user = getUser(key);
  if (!user) return null;
  const stored = loadStoredUsers();
  stored[key] = {
    ...user,
    ...updates,
  };
  saveStoredUsers(stored);
  return getPublicUser(stored[key]);
};

export const changePassword = (username, currentPassword, newPassword) => {
  const user = getUser(username);
  if (!user || user.password !== currentPassword) return false;
  const key = normalize(username);
  const stored = loadStoredUsers();
  stored[key] = {
    ...user,
    password: newPassword,
  };
  saveStoredUsers(stored);
  return true;
};

export const getAllowedUsers = () => Object.values(getAllUsers()).map((user) => ({
  username: user.username,
  name: user.name,
  email: user.email,
  role: user.role,
}));
