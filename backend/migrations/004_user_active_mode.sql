ALTER TABLE users
  ADD COLUMN active_mode ENUM('buyer', 'seller') NOT NULL DEFAULT 'buyer' AFTER preferred_language;
