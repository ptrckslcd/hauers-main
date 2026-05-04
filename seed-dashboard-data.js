const db = require('./config/db');

const DEMO_EMAILS = ['account@hauers.com', 'reviewee@hauers.com'];
const DEMO_EXAM_DATE = '2026-08-15';

const MATERIALS = [
  {
    title: 'Verbal Ability Quick Drills',
    domain: 'Verbal Ability',
    type: 'practice_set',
    difficulty: 'intermediate',
    exam_level: 'both',
    content_url: '/reviewee/materials',
    est_minutes: 20,
    description: 'Short drills for word meaning, grammar, and sentence correction.'
  },
  {
    title: 'Numerical Ability Core Review',
    domain: 'Numerical Ability',
    type: 'lesson_module',
    difficulty: 'basic',
    exam_level: 'both',
    content_url: '/reviewee/materials',
    est_minutes: 25,
    description: 'A focused review of percentage, number series, and word problems.'
  },
  {
    title: 'Analytical Reasoning Warmup',
    domain: 'Analytical Ability',
    type: 'lesson_module',
    difficulty: 'intermediate',
    exam_level: 'professional',
    content_url: '/reviewee/materials',
    est_minutes: 30,
    description: 'Pattern and logic drills for higher-order reasoning.'
  },
  {
    title: 'Clerical Precision Sheets',
    domain: 'Clerical Ability',
    type: 'reference_sheet',
    difficulty: 'basic',
    exam_level: 'both',
    content_url: '/reviewee/materials',
    est_minutes: 15,
    description: 'Speed and accuracy exercises for clerical comparisons and checking.'
  },
  {
    title: 'General Information Primer',
    domain: 'General Information',
    type: 'mock_exam',
    difficulty: 'intermediate',
    exam_level: 'professional',
    content_url: '/reviewee/materials',
    est_minutes: 35,
    description: 'Covers civic knowledge and Philippine government basics.'
  }
];

function pickWrongChoice(correctChoice) {
  const choices = ['a', 'b', 'c', 'd'];
  return choices.find(choice => choice !== correctChoice) || 'a';
}

async function getDemoUser() {
  const [rows] = await db.query(
    `SELECT id, batch_id, exam_level, first_name, last_name, email
     FROM users
     WHERE email IN (?, ?)
     ORDER BY CASE email WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END,
              is_enrolled DESC, is_onboarded DESC, id ASC
     LIMIT 1`,
    [...DEMO_EMAILS, DEMO_EMAILS[0], DEMO_EMAILS[1]]
  );

  if (rows.length) return rows[0];

  const [fallbackRows] = await db.query(
    `SELECT id, batch_id, exam_level, first_name, last_name, email
     FROM users
     WHERE role = 'reviewee' AND is_enrolled = 1 AND is_onboarded = 1
     ORDER BY id ASC
     LIMIT 1`
  );

  return fallbackRows[0] || null;
}

async function ensureMaterials() {
  const [domains] = await db.query('SELECT id, name FROM domains');
  const domainMap = new Map(domains.map(d => [d.name, d.id]));

  for (const material of MATERIALS) {
    const [existing] = await db.query('SELECT id FROM materials WHERE title = ? LIMIT 1', [material.title]);
    if (existing.length) continue;

    const domainId = domainMap.get(material.domain);
    if (!domainId) continue;

    await db.query(
      `INSERT INTO materials
        (domain_id, type, title, description, difficulty, exam_level, content_url, est_minutes, status, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', NULL)`,
      [
        domainId,
        material.type,
        material.title,
        material.description,
        material.difficulty,
        material.exam_level,
        material.content_url,
        material.est_minutes,
      ]
    );
  }
}

async function ensureValidExamDate(userId) {
  await db.query(
    `UPDATE learner_profiles
     SET target_exam_date = ?
     WHERE user_id = ? AND (target_exam_date IS NULL OR YEAR(target_exam_date) < 2000)`,
    [DEMO_EXAM_DATE, userId]
  );
}

async function seedDiagnosticSession(user, questions) {
  const [existing] = await db.query(
    `SELECT id FROM diagnostic_sessions WHERE user_id = ? AND status = 'completed' LIMIT 1`,
    [user.id]
  );

  if (existing.length || !questions.length) return;

  const answerPlan = new Map([
    ['Verbal Ability', [true, true]],
    ['Numerical Ability', [true, false]],
    ['Clerical Ability', [false, false]],
    ['General Information', [true, true]],
    ['Analytical Ability', [true, false]],
  ]);

  const answers = [];
  const domainStats = new Map();
  let correctCount = 0;

  for (const question of questions) {
    const plan = answerPlan.get(question.domain_name) || [true];
    const index = domainStats.get(question.domain_name) || 0;
    const shouldBeCorrect = plan[index] !== undefined ? plan[index] : true;
    domainStats.set(question.domain_name, index + 1);

    const selectedChoice = shouldBeCorrect ? question.correct_choice : pickWrongChoice(question.correct_choice);
    const isCorrect = selectedChoice === question.correct_choice;
    if (isCorrect) correctCount += 1;

    answers.push({
      questionId: question.id,
      selectedChoice,
      isCorrect,
      domainName: question.domain_name,
    });
  }

  const batchId = user.batch_id || 1;
  const examLevel = user.exam_level || 'professional';
  const [sessionRes] = await db.query(
    `INSERT INTO diagnostic_sessions
      (user_id, batch_id, exam_level, total_questions, correct_count, time_taken_s, status, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, 'completed', NOW())`,
    [user.id, batchId, examLevel, answers.length, correctCount, 2700]
  );

  for (const answer of answers) {
    await db.query(
      `INSERT INTO diagnostic_answers
        (session_id, question_id, selected_choice, is_correct, time_spent_ms)
       VALUES (?, ?, ?, ?, ?)`,
      [sessionRes.insertId, answer.questionId, answer.selectedChoice, answer.isCorrect, 180000]
    );
  }

  const domainRatings = new Map();
  for (const answer of answers) {
    const current = domainRatings.get(answer.domainName) || { total: 0, correct: 0 };
    current.total += 1;
    if (answer.isCorrect) current.correct += 1;
    domainRatings.set(answer.domainName, current);
  }

  const [domainRows] = await db.query('SELECT id, name FROM domains');
  const domainIdMap = new Map(domainRows.map(d => [d.name, d.id]));

  for (const [domainName, stats] of domainRatings.entries()) {
    const domainId = domainIdMap.get(domainName);
    if (!domainId) continue;

    const correctness = stats.total ? stats.correct / stats.total : 0;
    const theta = Math.round(1120 + (correctness * 260));

    await db.query(
      `INSERT INTO domain_ratings (user_id, domain_id, theta, k_factor, sessions_count)
       VALUES (?, ?, ?, 48.0, 1)
       ON DUPLICATE KEY UPDATE theta = VALUES(theta), k_factor = VALUES(k_factor), sessions_count = VALUES(sessions_count)`,
      [user.id, domainId, theta]
    );
  }

  await db.query(
    `INSERT INTO domain_rating_history (user_id, domain_id, session_id, session_type, theta)
     SELECT user_id, domain_id, ?, 'diagnostic', theta
     FROM domain_ratings
     WHERE user_id = ?`,
    [sessionRes.insertId, user.id]
  );

  await db.query(
    `UPDATE users SET is_enrolled = 1 WHERE id = ?`,
    [user.id]
  );
}

async function seedPracticeSession(user, questions) {
  const [existing] = await db.query(
    `SELECT id FROM practice_sessions WHERE user_id = ? AND status = 'completed' LIMIT 1`,
    [user.id]
  );

  if (existing.length || questions.length === 0) return;

  const batchId = user.batch_id || 1;
  const selectedQuestions = questions.slice(0, 5);
  const [sessionRes] = await db.query(
    `INSERT INTO practice_sessions
      (user_id, batch_id, session_type, total_questions, correct_count, time_taken_s, status, fatigue_detected, distribution_mode, started_at, completed_at)
     VALUES (?, ?, 'recommended', ?, ?, ?, 'completed', FALSE, '70_30', DATE_SUB(NOW(), INTERVAL 2 DAY), NOW())`,
    [user.id, batchId, selectedQuestions.length, 3, 1800]
  );

  for (const [index, question] of selectedQuestions.entries()) {
    const shouldBeCorrect = index < 3;
    const selectedChoice = shouldBeCorrect ? question.correct_choice : pickWrongChoice(question.correct_choice);
    const isCorrect = selectedChoice === question.correct_choice;
    const delta = isCorrect ? 24 : -12;

    await db.query(
      `INSERT INTO session_answers
        (session_id, question_id, selected_choice, is_correct, theta_delta_json, time_spent_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionRes.insertId, question.id, selectedChoice, isCorrect, JSON.stringify({ [question.domain_name]: delta }), 90000]
    );
  }
}

async function seedDashboardData() {
  try {
    const user = await getDemoUser();
    if (!user) {
      throw new Error('No demo reviewee found to seed dashboard data for.');
    }

    const [questions] = await db.query(
      `SELECT q.id, q.correct_choice, d.name AS domain_name
       FROM questions q
       JOIN question_domains qd ON q.id = qd.question_id
       JOIN domains d ON qd.domain_id = d.id
       ORDER BY q.id ASC
       LIMIT 10`
    );

    if (questions.length < 5) {
      throw new Error('Not enough seeded questions found. Run seed-questions.js first.');
    }

    await ensureMaterials();
    await ensureValidExamDate(user.id);
    await seedDiagnosticSession(user, questions);
    await seedPracticeSession(user, questions);

    console.log(`Seeded dashboard demo data for ${user.email} (user id ${user.id}).`);
  } catch (err) {
    console.error('Error seeding dashboard data:', err);
  } finally {
    process.exit(0);
  }
}

seedDashboardData();
