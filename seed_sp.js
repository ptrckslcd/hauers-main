const db = require('./config/db');

(async () => {
  try {
    const userId = 7;
    await db.query('DELETE FROM study_plans WHERE user_id = ?', [userId]);

    const [batchRes] = await db.query('SELECT batch_id FROM users WHERE id = ?', [userId]);
    const batchId = batchRes.length ? batchRes[0].batch_id : 1;

    const [planRes] = await db.query('INSERT INTO study_plans(user_id, batch_id) VALUES(?, ?)', [userId, batchId]);
    const planId = planRes.insertId;

    const [weekRes] = await db.query('INSERT INTO study_plan_weeks(plan_id, week_number, week_start, week_end, phase_label) VALUES(?, 1, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 5 DAY, "Baseline")', [planId]);
    const weekId = weekRes.insertId;

    await db.query('INSERT INTO study_plan_days(week_id, day_of_week, domain_id, focus_label, est_minutes, is_rest_day) VALUES(?, DAYOFWEEK(CURDATE())-1, 2, "Targeted Practice: Numerical Reasoning", 45, false)', [weekId]);

    console.log("Seeded successfully");
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
})();