/**
 * seed-announcements.js
 * Inserts sample announcements so the Announcements page can be tested.
 * Run once with:  node seed-announcements.js
 */

const db = require('./config/db');

async function seed() {
  try {
    // Find the first admin user to use as publisher
    const [admins] = await db.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    if (!admins.length) {
      console.error('No admin user found. Create an admin first.');
      process.exit(1);
    }
    const adminId = admins[0].id;

    // Find the first batch to use for batch-specific announcements
    const [batches] = await db.query('SELECT id FROM batches LIMIT 1');
    const batchId = batches.length ? batches[0].id : null;

    const announcements = [
      {
        title: 'Welcome to Hauers!',
        body: 'Welcome to the Hauers Adaptive Review System, built exclusively for CSPC ACCESS reviewees.\n\nExplore your dashboard, complete the diagnostic test, and follow your personalised study plan to reach the 80% passing threshold before your exam. Our platform adapts to your strengths and weaknesses so every hour you spend here counts.\n\nGood luck with your review — the ACCESS team is rooting for you.',
        category: 'general',
        target_type: 'all',
        target_batch_id: null,
        status: 'published',
        publish_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        title: 'Mock Exam Schedule — August 2026 Batch',
        body: 'The first full-length mock exam for the August 2026 batch will be held on June 15, 2026. This will be a fully-online proctored exam administered through Hauers.\n\nPlease ensure you have completed at least 50% of your study plan before the mock exam date. Results will be released within 24 hours and will factor into your readiness score.\n\nFor questions about the schedule, contact your ACCESS coordinator.',
        category: 'schedule',
        target_type: batchId ? 'batch' : 'all',
        target_batch_id: batchId,
        status: 'published',
        publish_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
      {
        title: 'Important: System Maintenance on May 10',
        body: 'Hauers will undergo scheduled maintenance on May 10, 2026 from 12:00 AM to 4:00 AM (Philippine Time). All services — including the review platform, study plan, and quiz engine — will be temporarily unavailable during this window.\n\nPlease plan your study sessions accordingly. Your progress data will be preserved and no sessions will be interrupted since the window falls overnight.\n\nThank you for your patience.',
        category: 'important',
        target_type: 'all',
        target_batch_id: null,
        status: 'published',
        publish_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
      {
        title: 'New Study Materials Available',
        body: 'A fresh batch of review materials has been added to the Learning Materials library. New additions include:\n\n• Analytical Ability — Pattern Recognition workbook\n• Numerical Ability — Data Sufficiency drill set\n• General Information — Philippine Constitution reference sheet\n• Clerical Operations — Speed and accuracy mock set\n\nMaterials marked with a star are personalised recommendations based on your diagnostic results. Head to the Learning Materials section to get started.',
        category: 'general',
        target_type: 'all',
        target_batch_id: null,
        status: 'published',
        publish_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      },
      {
        title: 'Reminder: Diagnostic Test Deadline',
        body: 'All enrolled reviewees must complete the Diagnostic Test by May 15, 2026 to receive a personalised study plan.\n\nReviewees who have not completed the diagnostic will be assigned a default study plan and will miss out on domain-specific recommendations. The diagnostic takes approximately 45 minutes and covers all five exam domains.\n\nIf you have already completed it, no further action is required. Check your progress page to confirm your readiness score.',
        category: 'important',
        target_type: batchId ? 'batch' : 'all',
        target_batch_id: batchId,
        status: 'published',
        publish_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
    ];

    for (const ann of announcements) {
      await db.query(
        `INSERT INTO announcements
           (title, body, category, target_type, target_batch_id, published_by, status, publish_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ann.title,
          ann.body,
          ann.category,
          ann.target_type,
          ann.target_batch_id,
          adminId,
          ann.status,
          ann.publish_at,
        ]
      );
      console.log(`  Inserted: "${ann.title}"`);
    }

    console.log('\nSeeded 5 announcements successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
}

seed();
