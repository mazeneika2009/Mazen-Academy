import { Router } from 'express';
import {
  getQuiz, getQuizQuestions,
  submitQuizAnswer, submitQuizQuestionAnswer,
  getQuizAnswers, getQuizStats, getAllQuizAnswers
} from '../controllers/quiz.controller.js';

const router = Router();

router.get('/quiz', getQuiz);
router.get('/quiz_questions', getQuizQuestions);
router.post('/quiz/answer', submitQuizAnswer);
router.post('/quiz_questions/submit', submitQuizQuestionAnswer);
router.post('/quiz_answers/get', getQuizAnswers);
router.post('/quiz_answers/stats', getQuizStats);
router.get('/quiz_answers/all', getAllQuizAnswers);

export default router;
