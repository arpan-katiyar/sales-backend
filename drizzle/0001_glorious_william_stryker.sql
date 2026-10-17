ALTER TABLE `refresh_tokens` ADD `session_expires_at` datetime;
UPDATE `refresh_tokens` SET `session_expires_at` = `expires_at` WHERE `session_expires_at` IS NULL;
ALTER TABLE `refresh_tokens` MODIFY `session_expires_at` datetime NOT NULL;
