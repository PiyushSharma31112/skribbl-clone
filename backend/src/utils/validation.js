const DEFAULT_SETTINGS = {
  maxPlayers: 8,
  rounds: 3,
  drawTime: 80,
  wordCount: 3,
  hints: 2,
  category: 'All',
};

const SETTING_RANGES = {
  maxPlayers: [2, 20],
  rounds: [2, 10],
  drawTime: [15, 240],
  wordCount: [1, 5],
  hints: [0, 5],
};

const CATEGORIES = new Set(['All', 'Animals', 'Objects', 'Food', 'Actions']);

export function normalizePlayerName(value) {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 18 ? name : null;
}

export function validateRoomSettings(value) {
  if (value !== undefined && (value === null || typeof value !== 'object' || Array.isArray(value))) {
    return null;
  }

  if (
    value &&
    Object.keys(value).some((key) => !Object.hasOwn(DEFAULT_SETTINGS, key))
  ) {
    return null;
  }

  const settings = { ...DEFAULT_SETTINGS, ...value };
  for (const [key, [min, max]] of Object.entries(SETTING_RANGES)) {
    if (!Number.isInteger(settings[key]) || settings[key] < min || settings[key] > max) {
      return null;
    }
  }

  if (!CATEGORIES.has(settings.category)) return null;
  return settings;
}
