const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlist.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// সব রাউটে JWT Auth বাধ্যতামূলক
router.use(authMiddleware);

router.get('/', playlistController.list);
router.post('/', playlistController.create);
router.post('/import-youtube', playlistController.importYouTubePlaylist);     // POST /api/v1/playlists/import-youtube
router.get('/:playlistId', playlistController.get);
router.patch('/:playlistId', playlistController.update);
router.delete('/:playlistId', playlistController.delete);
router.post('/:playlistId/videos', playlistController.addVideo);
router.delete('/:playlistId/videos/:videoId', playlistController.removeVideo);
router.patch('/:playlistId/videos/:videoId/progress', playlistController.updateVideoProgress); // PATCH /api/v1/playlists/:playlistId/videos/:videoId/progress

module.exports = router;