const db = require('./config/db');

const questionsData = [
  // Verbal Ability
  {
    text: "Choose the word that is most nearly opposite in meaning to 'OMINOUS'.",
    a: "Threatening", b: "Auspicious", c: "Gloomy", d: "Sinister",
    correct: "b", domainCode: "verbal", level: "both", difficulty: "medium"
  },
  {
    text: "Identify the error in the sentence: 'The committee have decided to postpone the meeting.'",
    a: "The committee", b: "have decided", c: "to postpone", d: "the meeting",
    correct: "b", domainCode: "verbal", level: "both", difficulty: "easy"
  },
  // Numerical Ability
  {
    text: "If a shirt costs ₱800 and is on sale for 20% off, what is the final price?",
    a: "₱600", b: "₱640", c: "₱680", d: "₱720",
    correct: "b", domainCode: "numerical", level: "both", difficulty: "easy"
  },
  {
    text: "What is the next number in the series: 2, 6, 12, 20, __?",
    a: "28", b: "30", c: "32", d: "36",
    correct: "b", domainCode: "numerical", level: "both", difficulty: "medium"
  },
  // Clerical Ability
  {
    text: "Which of the following is arranged in correct alphabetical order?",
    a: "Bautista, Bernal, Bernardo, Blanco", b: "Bernal, Bautista, Bernardo, Blanco", 
    c: "Bautista, Bernardo, Bernal, Blanco", d: "Blanco, Bernardo, Bernal, Bautista",
    correct: "a", domainCode: "clerical", level: "both", difficulty: "easy"
  },
  {
    text: "Match the original string: 'XZY-987-AB'",
    a: "XYZ-987-AB", b: "XZY-978-AB", c: "XZY-987-AB", d: "XZY-987-BA",
    correct: "c", domainCode: "clerical", level: "both", difficulty: "easy"
  },
  // General Information
  {
    text: "Under the 1987 Philippine Constitution, who has the sole power to declare the existence of a state of war?",
    a: "The President", b: "The Supreme Court", c: "The Congress", d: "The Armed Forces",
    correct: "c", domainCode: "general_info", level: "professional", difficulty: "medium"
  },
  {
    text: "What is the primary function of the Civil Service Commission?",
    a: "To enact laws", b: "To interpret laws", 
    c: "To act as the central personnel agency of the government", d: "To manage the national budget",
    correct: "c", domainCode: "general_info", level: "professional", difficulty: "easy"
  },
  // Analytical Ability
  {
    text: "All birds have feathers. A penguin is a bird. Therefore, a penguin has feathers. This is an example of:",
    a: "Inductive reasoning", b: "Deductive reasoning", c: "Fallacy", d: "Hypothesis",
    correct: "b", domainCode: "analytical", level: "professional", difficulty: "medium"
  },
  {
    text: "If 'A' is taller than 'B', and 'B' is taller than 'C', who is the shortest?",
    a: "A", b: "B", c: "C", d: "Cannot be determined",
    correct: "c", domainCode: "analytical", level: "professional", difficulty: "easy"
  }
];

async function seedQuestions() {
  try {
    const [domains] = await db.query('SELECT id, code FROM domains');
    const domainMap = {};
    domains.forEach(d => domainMap[d.code] = d.id);

    console.log('Seeding 10 questions...');
    for (const q of questionsData) {
      const [res] = await db.query(
        `INSERT INTO questions (question_text, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty, exam_level, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [q.text, q.a, q.b, q.c, q.d, q.correct, q.difficulty, q.level]
      );
      const questionId = res.insertId;
      
      const domainId = domainMap[q.domainCode];
      if (domainId) {
        await db.query(
          `INSERT INTO question_domains (question_id, domain_id) VALUES (?, ?)`,
          [questionId, domainId]
        );
      }
    }

    // Also seed an enrollment code for the Demo Batch
    await db.query(
      `INSERT IGNORE INTO enrollment_codes (code, batch_id, max_uses, is_active)
       VALUES ('ACCESS-2026', 1, 100, 1)`
    );

    console.log('Successfully seeded questions and an enrollment code (ACCESS-2026).');
  } catch (err) {
    console.error('Error seeding questions:', err);
  } finally {
    process.exit(0);
  }
}

seedQuestions();
