const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// সব session রাউটে JWT Auth বাধ্যতামূলক
router.use(authMiddleware);

router.get('/active', sessionController.getActiveSession);       // GET  /api/v1/sessions/active
router.get('/', sessionController.getSessionHistory);            // GET  /api/v1/sessions
router.post('/start', sessionController.startSession);           // POST /api/v1/sessions/start
router.patch('/:id/pause', sessionController.pauseSession);      // PATCH /api/v1/sessions/:id/pause
router.patch('/:id/resume', sessionController.resumeSession);    // PATCH /api/v1/sessions/:id/resume
router.post('/:id/complete', sessionController.completeSession); // POST /api/v1/sessions/:id/complete

module.exports = router;
