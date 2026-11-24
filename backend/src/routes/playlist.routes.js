const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// সব রাউটে JWT Auth বাধ্যতামূলক
router.use(authMiddleware);

router.get('/', playlistController.list);
router.post('/', playlistController.create);
router.get('/:playlistId', playlistController.get);
router.patch('/:playlistId', playlistController.update);
router.delete('/:playlistId', playlistController.delete);
router.post('/:playlistId/videos', playlistController.addVideo);
router.delete('/:playlistId/videos/:videoId', playlistController.removeVideo);

module.exports = router;