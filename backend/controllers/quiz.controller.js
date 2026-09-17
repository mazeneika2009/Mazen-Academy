import { pool, readDB, writeDB, upsertQuery, isPostgres } from '../server/db.js';
import { mysqlNow } from '../services/helpers.js';

export async function getQuiz(req, res) {
  try {
    const { seedId } = req.query;
    if (!seedId) return res.status(400).json({ error: 'seedId is required.' });
    const db = readDB();
    const questions = db.quiz_questions.filter(q => q.seedId === seedId);
    return res.json({ success: true, questions });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load quiz.' });
  }
}

export async function getQuizQuestions(req, res) {
  try {
    const { seedId } = req.query;
    const db = readDB();
    const map = new Map();
    (db.quiz_questions || []).forEach(q => map.set(q.id, q));
    try {
      let sql = 'SELECT * FROM quiz_questions';
      const params = [];
      if (seedId) { sql += ' WHERE seedId = ?'; params.push(seedId); }
      const [rows] = await pool.query(sql, params);
      rows.forEach(r => {
        if (!map.has(r.id)) {
          r.optionsEn = typeof r.optionsEn === 'string' ? JSON.parse(r.optionsEn) : r.optionsEn;
          r.optionsAr = typeof r.optionsAr === 'string' ? JSON.parse(r.optionsAr) : r.optionsAr;
          r.optionsTr = typeof r.optionsTr === 'string' ? JSON.parse(r.optionsTr) : r.optionsTr;
          map.set(r.id, r);
        }
      });
    } catch {}
    let results = [...map.values()];
    if (seedId) results = results.filter(q => q.seedId === seedId);
    return res.json(results);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch quiz questions' });
  }
}

export async function submitQuizAnswer(req, res) {
  try {
    const { seedId, sessionId, questionId, answer } = req.body;
    if (!sessionId || !questionId || answer === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(401).json({ error: 'Unauthorized session' });

    const question = db.quiz_questions.find(q => q.id === questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const isCorrect = question.correctIndex === Number(answer);
    const now = mysqlNow();

    db.quiz_answers = db.quiz_answers.filter(a => !(a.userId === user.id && a.questionId === questionId));
    const userEmail = user.email || '';
    const userName = user.name || user.email?.split('@')[0] || '';
    db.quiz_answers.push({
      userId: user.id,
      userEmail,
      userName,
      seedId: question.seedId,
      questionId,
      isCorrect,
      timestamp: now
    });

    writeDB(db);

    const quizAnswerColumns = ['userId', 'userEmail', 'userName', 'seedId', 'questionId', 'isCorrect', 'timestamp'];
    const quizAnswerPk = isPostgres ? ['userId', 'questionId'] : [];
    pool.query(
      upsertQuery('quiz_answers', quizAnswerColumns, quizAnswerPk),
      [user.id, userEmail, userName, question.seedId, questionId, isCorrect, now]
    ).catch(err => console.warn('[MySQL] Quiz answer sync failed:', err));

    return res.json({ correct: isCorrect });
  } catch (err) {
    return res.status(500).json({ error: 'Submission failed' });
  }
}

export async function submitQuizQuestionAnswer(req, res) {
  try {
    const { sessionId, questionId, selectedIndex } = req.body;
    if (!sessionId || !questionId || selectedIndex === undefined) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(401).json({ error: 'Unauthorized session' });

    const question = db.quiz_questions.find(q => q.id === questionId);
    if (!question) return res.status(404).json({ error: 'Question not found' });

    const isCorrect = question.correctIndex === Number(selectedIndex);
    const now = mysqlNow();

    db.quiz_answers = db.quiz_answers.filter(a => !(a.userId === user.id && a.questionId === questionId));
    const userEmail = user.email || '';
    const userName = user.name || user.email?.split('@')[0] || '';
    db.quiz_answers.push({
      userId: user.id,
      userEmail,
      userName,
      seedId: question.seedId,
      questionId,
      isCorrect,
      timestamp: now
    });

    writeDB(db);

    const qaColumns = ['userId', 'userEmail', 'userName', 'seedId', 'questionId', 'isCorrect', 'timestamp'];
    const qaPk = isPostgres ? ['userId', 'questionId'] : [];
    pool.query(
      upsertQuery('quiz_answers', qaColumns, qaPk),
      [user.id, userEmail, userName, question.seedId, questionId, isCorrect, now]
    ).catch(err => console.warn('[MySQL] Quiz answer sync failed:', err));

    return res.json({ success: true, isCorrect, correctIndex: question.correctIndex });
  } catch (err) {
    return res.status(500).json({ error: 'Submission failed' });
  }
}

export async function getQuizAnswers(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const answers = db.quiz_answers.filter(a => a.userId === user.id);
    return res.json({ answers });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load quiz answers' });
  }
}

export async function getQuizStats(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(401).json({ error: 'Unauthorized' });

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const answers = db.quiz_answers.filter(a => a.userId === user.id);
    const totalAnswered = answers.length;
    const correct = answers.filter(a => a.isCorrect).length;
    const wrong = totalAnswered - correct;
    const totalQuestions = (db.quiz_questions || []).length;

    const questionsBySeed = {};
    (db.quiz_questions || []).forEach(q => {
      questionsBySeed[q.seedId] = (questionsBySeed[q.seedId] || 0) + 1;
    });

    const seedStats = {};
    Object.keys(questionsBySeed).forEach(seedId => {
      seedStats[seedId] = { total: questionsBySeed[seedId], correct: 0 };
    });

    answers.forEach(a => {
      if (seedStats[a.seedId]) {
        if (a.isCorrect) seedStats[a.seedId].correct++;
      }
    });

    const rate = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

    return res.json({ totalAnswered, correct, wrong, totalQuestions, rate, seedStats });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load quiz stats' });
  }
}

export async function getAllQuizAnswers(req, res) {
  try {
    const db = readDB();
    const map = new Map();
    (db.quiz_answers || []).forEach(a => map.set(a.userId + '|' + a.questionId, a));
    try {
      const [rows] = await pool.query('SELECT * FROM quiz_answers');
      rows.forEach(r => {
        const key = r.userId + '|' + r.questionId;
        if (!map.has(key)) map.set(key, r);
      });
    } catch {}
    return res.json([...map.values()]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load quiz answers' });
  }
}
