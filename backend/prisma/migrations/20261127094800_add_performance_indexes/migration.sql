-- CreateIndex
CREATE INDEX "attention_scores_session_id_created_at_idx" ON "attention_scores"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "playlists_user_id_created_at_idx" ON "playlists"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sessions_user_id_status_idx" ON "sessions"("user_id", "status");

-- CreateIndex
CREATE INDEX "sessions_user_id_start_time_idx" ON "sessions"("user_id", "start_time");

-- CreateIndex
CREATE INDEX "videos_playlist_id_idx" ON "videos"("playlist_id");
