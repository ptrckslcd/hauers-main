const DEFAULT_SETTINGS = Object.freeze({
  platformNameDisplay: 'Hauers',
  sessionQuestionCountDefault: 15,
  kFactors: {
    diagnostic: 48,
    standard: 24,
  },
  studyPlanPhases: [
    { label: 'Foundation', startWeek: 1, endWeek: 4 },
    { label: 'Build', startWeek: 5, endWeek: 8 },
    { label: 'Refine', startWeek: 9, endWeek: 12 },
  ],
});

function cloneDefaultSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
}

function normalizeSettingsJson(raw) {
  if (!raw || typeof raw !== 'object') return cloneDefaultSettings();
  const base = cloneDefaultSettings();

  if (raw.platformNameDisplay != null) base.platformNameDisplay = String(raw.platformNameDisplay).trim() || 'Hauers';
  if (raw.sessionQuestionCountDefault != null) {
    const n = Number(raw.sessionQuestionCountDefault);
    if (Number.isFinite(n)) base.sessionQuestionCountDefault = Math.max(1, Math.min(200, Math.round(n)));
  }

  const k = raw.kFactors && typeof raw.kFactors === 'object' ? raw.kFactors : {};
  if (k.diagnostic != null) {
    const n = Number(k.diagnostic);
    if (Number.isFinite(n)) base.kFactors.diagnostic = Math.max(1, Math.min(200, n));
  }
  if (k.standard != null) {
    const n = Number(k.standard);
    if (Number.isFinite(n)) base.kFactors.standard = Math.max(1, Math.min(200, n));
  }

  if (Array.isArray(raw.studyPlanPhases)) {
    const phases = raw.studyPlanPhases
      .map(p => ({
        label: String(p?.label || '').trim(),
        startWeek: Number(p?.startWeek),
        endWeek: Number(p?.endWeek),
      }))
      .filter(p => p.label && Number.isFinite(p.startWeek) && Number.isFinite(p.endWeek))
      .map(p => ({
        label: p.label.slice(0, 60),
        startWeek: Math.max(1, Math.min(520, Math.round(p.startWeek))),
        endWeek: Math.max(1, Math.min(520, Math.round(p.endWeek))),
      }))
      .map(p => (p.endWeek < p.startWeek ? { ...p, endWeek: p.startWeek } : p));

    if (phases.length) base.studyPlanPhases = phases.slice(0, 12);
  }

  return base;
}

function validateSettingsPayload(body) {
  if (!body || typeof body !== 'object') return false;
  if (!('platformNameDisplay' in body)) return false;
  if (!('sessionQuestionCountDefault' in body)) return false;
  if (!('kFactors' in body)) return false;
  if (!('studyPlanPhases' in body)) return false;
  return true;
}

async function ensurePlatformSettingsRow(db) {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS platform_settings (
        id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
        settings_json JSON NOT NULL,
        updated_by INT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT platform_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
      )`
    );

    await db.query(
      'INSERT IGNORE INTO platform_settings (id, settings_json) VALUES (1, ?)',
      [JSON.stringify(DEFAULT_SETTINGS)]
    );
  } catch (e) {
    // If the host DB doesn't support JSON type, it'll be a text-like column anyway; allow inserts to proceed.
    throw e;
  }
}

async function getPlatformSettings(db) {
  await ensurePlatformSettingsRow(db);
  const [[row]] = await db.query('SELECT settings_json FROM platform_settings WHERE id = 1');
  if (!row) return cloneDefaultSettings();
  const json = typeof row.settings_json === 'string' ? safeJson(row.settings_json) : row.settings_json;
  return normalizeSettingsJson(json);
}

async function savePlatformSettings(db, settingsJson, updatedBy) {
  await ensurePlatformSettingsRow(db);
  const normalized = normalizeSettingsJson(settingsJson);
  await db.query(
    'UPDATE platform_settings SET settings_json = ?, updated_by = ? WHERE id = 1',
    [JSON.stringify(normalized), updatedBy || null]
  );
  return normalized;
}

function safeJson(s) {
  try { return JSON.parse(s); } catch (_) { return null; }
}

module.exports = {
  DEFAULT_SETTINGS,
  cloneDefaultSettings,
  normalizeSettingsJson,
  validateSettingsPayload,
  getPlatformSettings,
  savePlatformSettings,
  ensurePlatformSettingsRow,
};

