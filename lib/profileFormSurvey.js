/**
 * Profile Form — custom schema stored in DB + conversion to SurveyJS JSON for rendering.
 *
 * We store a lightweight admin-friendly schema:
 * { questions: [{ name, title, type, isRequired, choices? }] }
 *
 * Then convert it to a SurveyJS Form Library JSON:
 * { pages: [{ name, elements: [...] }] }
 */

const SUPPORTED_TYPES = new Set([
  'text',
  'number',
  'date',
  'radio',
  'checkbox',
  'dropdown',
  'rating',
]);

const DEFAULT_SCHEMA_JSON = Object.freeze({
  questions: [],
});

function cloneDefaultSchema() {
  return JSON.parse(JSON.stringify(DEFAULT_SCHEMA_JSON));
}

function normalizeSchemaJson(raw) {
  let j = raw;
  if (typeof j === 'string') {
    try {
      j = JSON.parse(j);
    } catch {
      j = null;
    }
  }

  // Back-compat: if we find old SurveyJS pages JSON, convert to schema.
  if (j && typeof j === 'object' && Array.isArray(j.pages)) {
    return surveyJsonToSchema(j);
  }

  if (!j || typeof j !== 'object' || !Array.isArray(j.questions)) {
    return cloneDefaultSchema();
  }

  // sanitize questions
  const cleaned = [];
  for (const q of j.questions) {
    if (!q || typeof q !== 'object') continue;
    const type = String(q.type || '').toLowerCase();
    const name = String(q.name || '').trim();
    const title = String(q.title || '').trim();
    if (!SUPPORTED_TYPES.has(type) || !name || !title) continue;
    const isRequired = !!q.isRequired;
    let choices = undefined;
    if (['radio', 'checkbox', 'dropdown'].includes(type)) {
      if (Array.isArray(q.choices)) {
        const c = q.choices.map((x) => String(x).trim()).filter(Boolean);
        if (c.length) choices = c;
      }
    }
    cleaned.push({ name, title, type, isRequired, choices });
  }
  return { questions: cleaned };
}

function validateSchemaPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  if (!Array.isArray(body.questions)) return false;
  // allow empty questions, but ensure all provided are valid-ish
  for (const q of body.questions) {
    if (!q || typeof q !== 'object') return false;
    const type = String(q.type || '').toLowerCase();
    const name = String(q.name || '').trim();
    const title = String(q.title || '').trim();
    if (!SUPPORTED_TYPES.has(type) || !name || !title) return false;
    if (['radio', 'checkbox', 'dropdown'].includes(type)) {
      if (!Array.isArray(q.choices) || !q.choices.map((x) => String(x).trim()).filter(Boolean).length) return false;
    }
  }
  return true;
}

function resolveSurveyTitle(title, fallback) {
  if (title == null || title === '') return fallback;
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    return (
      title.default ||
      title.en ||
      title['en-US'] ||
      (Object.keys(title).length ? String(Object.values(title)[0]) : fallback)
    );
  }
  return fallback;
}

function schemaToSurveyJson(schema) {
  const s = normalizeSchemaJson(schema);
  const elements = s.questions.map((q) => {
    const base = {
      name: q.name,
      title: q.title,
      isRequired: !!q.isRequired,
    };
    switch (q.type) {
      case 'text':
        return { type: 'text', ...base };
      case 'number':
        return { type: 'text', inputType: 'number', ...base };
      case 'date':
        return { type: 'text', inputType: 'date', ...base };
      case 'radio':
        return { type: 'radiogroup', choices: q.choices || [], ...base };
      case 'checkbox':
        return { type: 'checkbox', choices: q.choices || [], ...base };
      case 'dropdown':
        return { type: 'dropdown', choices: q.choices || [], ...base };
      case 'rating':
        return { type: 'rating', rateValues: [1, 2, 3, 4, 5], ...base };
      default:
        return { type: 'text', ...base };
    }
  });
  return {
    pages: [
      {
        name: 'profile_custom',
        title: 'Additional information',
        elements,
      },
    ],
  };
}

function surveyJsonToSchema(surveyJson) {
  const pages = Array.isArray(surveyJson?.pages) ? surveyJson.pages : [];
  const questions = [];

  function walk(elements) {
    if (!Array.isArray(elements)) return;
    for (const el of elements) {
      if (!el || typeof el !== 'object') continue;
      if (el.type === 'panel') {
        walk(el.elements || el.items || []);
        continue;
      }
      const name = String(el.name || '').trim();
      if (!name) continue;
      const title = resolveSurveyTitle(el.title, name);
      const isRequired = !!el.isRequired;
      let type = 'text';
      let choices = undefined;

      switch (el.type) {
        case 'radiogroup':
          type = 'radio';
          choices = Array.isArray(el.choices) ? el.choices : [];
          break;
        case 'checkbox':
          type = 'checkbox';
          choices = Array.isArray(el.choices) ? el.choices : [];
          break;
        case 'dropdown':
          type = 'dropdown';
          choices = Array.isArray(el.choices) ? el.choices : [];
          break;
        case 'rating':
          type = 'rating';
          break;
        case 'text':
        default:
          if (String(el.inputType || '').toLowerCase() === 'number') type = 'number';
          else if (String(el.inputType || '').toLowerCase() === 'date') type = 'date';
          else type = 'text';
      }

      if (!SUPPORTED_TYPES.has(type)) continue;
      if (['radio', 'checkbox', 'dropdown'].includes(type)) {
        const c = (choices || []).map((x) => String(x).trim()).filter(Boolean);
        if (!c.length) continue;
        questions.push({ name, title, type, isRequired, choices: c });
      } else {
        questions.push({ name, title, type, isRequired });
      }
    }
  }

  for (const p of pages) {
    walk(p.elements || p.questions || []);
  }
  return { questions };
}

function extractSchemaColumns(schema) {
  const s = normalizeSchemaJson(schema);
  return s.questions.map((q) => ({ field_key: q.name, label: q.title }));
}

function mergeColumnOrder(columns, savedOrder) {
  const byKey = new Map(columns.map((c) => [c.field_key, c]));
  const used = new Set();
  const out = [];
  if (Array.isArray(savedOrder)) {
    for (const k of savedOrder) {
      if (typeof k !== 'string' || !byKey.has(k) || used.has(k)) continue;
      used.add(k);
      out.push(byKey.get(k));
    }
  }
  for (const c of columns) {
    if (!used.has(c.field_key)) out.push(c);
  }
  return out;
}

async function ensureProfileFormRow(db) {
  const def = cloneDefaultSchema();
  try {
    await db.query(
      // MariaDB JSON is an alias for LONGTEXT in many installs; CAST(... AS JSON) can fail.
      // MySQL accepts a JSON-formatted string for JSON columns and validates it.
      'INSERT IGNORE INTO profile_form_definition (id, survey_json) VALUES (1, ?)',
      [JSON.stringify(def)]
    );
  } catch (err) {
    // If the table wasn't migrated yet, create it lazily (dev convenience).
    if (err && (err.code === 'ER_NO_SUCH_TABLE' || err.errno === 1146)) {
      await db.query(
        `CREATE TABLE IF NOT EXISTS profile_form_definition (
           id TINYINT NOT NULL PRIMARY KEY DEFAULT 1,
           survey_json JSON NOT NULL,
           updated_by INT NULL,
           updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
         )`
      );
      await db.query(
        'INSERT IGNORE INTO profile_form_definition (id, survey_json) VALUES (1, ?)',
        [JSON.stringify(def)]
      );
      return;
    }
    throw err;
  }
}

async function getProfileFormSchemaJson(db) {
  await ensureProfileFormRow(db);
  const [[row]] = await db.query('SELECT survey_json FROM profile_form_definition WHERE id = 1 LIMIT 1');
  if (!row?.survey_json) return cloneDefaultSchema();
  return normalizeSchemaJson(row.survey_json);
}

async function saveProfileFormSchemaJson(db, schemaJson, updatedBy) {
  await ensureProfileFormRow(db);
  await db.query(
    'UPDATE profile_form_definition SET survey_json = ?, updated_by = ? WHERE id = 1',
    [JSON.stringify(schemaJson), updatedBy]
  );
}

function formatCustomJsonValue(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join('; ');
  if (typeof v === 'object') return JSON.stringify(v);
  return v;
}

module.exports = {
  SUPPORTED_TYPES,
  DEFAULT_SCHEMA_JSON,
  cloneDefaultSchema,
  normalizeSchemaJson,
  validateSchemaPayload,
  schemaToSurveyJson,
  surveyJsonToSchema,
  extractSchemaColumns,
  mergeColumnOrder,
  ensureProfileFormRow,
  getProfileFormSchemaJson,
  saveProfileFormSchemaJson,
  formatCustomJsonValue,
  resolveSurveyTitle,
};
