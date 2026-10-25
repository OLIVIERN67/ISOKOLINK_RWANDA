-- ISOKOLINK RWANDA — initial schema (MySQL 8.0+)
-- Time-zone policy: all DATETIME values are stored in UTC. The application
-- writes UTC explicitly and converts for display on the client.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('active','suspended','deactivated') NOT NULL DEFAULT 'active',
  preferred_language VARCHAR(5) NOT NULL DEFAULT 'en',
  notification_email_enabled TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status),
  KEY idx_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT UNSIGNED NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  KEY idx_user_roles_role (role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE RESTRICT,
  CONSTRAINT fk_user_roles_granted_by FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address VARCHAR(64) NULL,
  user_agent VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  KEY idx_sessions_user (user_id),
  KEY idx_sessions_expiry (expires_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type ENUM('email_verification','password_reset') NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_tokens_hash (token_hash),
  KEY idx_auth_tokens_user_type (user_id, type),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS locations (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type ENUM('province','district','sector','city') NOT NULL,
  parent_id INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_locations_name_type (name, type),
  KEY idx_locations_parent (parent_id),
  CONSTRAINT fk_locations_parent FOREIGN KEY (parent_id) REFERENCES locations (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS markets (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  location_id INT UNSIGNED NOT NULL,
  address VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_markets_name_location (name, location_id),
  KEY idx_markets_location (location_id),
  CONSTRAINT fk_markets_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(500) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name),
  UNIQUE KEY uq_categories_slug (slug),
  KEY idx_categories_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS units (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  label VARCHAR(50) NOT NULL,
  dimension VARCHAR(20) NOT NULL,
  factor_to_base DECIMAL(18,6) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uq_units_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  business_name VARCHAR(150) NOT NULL,
  description TEXT NULL,
  location_id INT UNSIGNED NULL,
  market_id INT UNSIGNED NULL,
  contact_phone VARCHAR(30) NULL,
  contact_email VARCHAR(255) NULL,
  preferred_contact ENUM('message','phone','email') NOT NULL DEFAULT 'message',
  public_contact_visibility TINYINT(1) NOT NULL DEFAULT 0,
  profile_image_url VARCHAR(500) NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_seller_profiles_user (user_id),
  KEY idx_seller_profiles_location (location_id),
  KEY idx_seller_profiles_market (market_id),
  CONSTRAINT fk_seller_profiles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_seller_profiles_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE SET NULL,
  CONSTRAINT fk_seller_profiles_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id BIGINT UNSIGNED NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  unit_id INT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  quantity DECIMAL(12,3) NOT NULL DEFAULT 0,
  location_id INT UNSIGNED NOT NULL,
  market_id INT UNSIGNED NULL,
  availability ENUM('available','unavailable','sold') NOT NULL DEFAULT 'available',
  approval_status ENUM('pending','approved','rejected','requires_correction','suspended') NOT NULL DEFAULT 'pending',
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  rejection_reason TEXT NULL,
  submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME NULL,
  approved_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_products_public (approval_status, availability, is_archived),
  KEY idx_products_seller (seller_id, approval_status),
  KEY idx_products_category (category_id),
  KEY idx_products_location (location_id),
  KEY idx_products_market (market_id),
  KEY idx_products_price (price),
  KEY idx_products_name (name),
  KEY idx_products_updated (updated_at),
  CONSTRAINT fk_products_seller FOREIGN KEY (seller_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_products_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE SET NULL,
  CONSTRAINT fk_products_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_products_price CHECK (price >= 0),
  CONSTRAINT chk_products_quantity CHECK (quantity >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  url VARCHAR(500) NOT NULL,
  alt_text VARCHAR(255) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product_images_product (product_id, sort_order),
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_approval_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  admin_id BIGINT UNSIGNED NULL,
  action ENUM('submitted','approved','rejected','correction_requested','suspended','reinstated','seller_edited') NOT NULL,
  reason TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_approval_history_product (product_id, created_at),
  KEY idx_approval_history_admin (admin_id),
  CONSTRAINT fk_approval_history_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_history_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS market_price_observations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_name VARCHAR(160) NOT NULL,
  category_id INT UNSIGNED NOT NULL,
  market_id INT UNSIGNED NULL,
  location_id INT UNSIGNED NOT NULL,
  unit_id INT UNSIGNED NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'RWF',
  observed_on DATE NOT NULL,
  source VARCHAR(160) NOT NULL,
  verification_status ENUM('verified','unverified') NOT NULL DEFAULT 'unverified',
  observed_by VARCHAR(160) NULL,
  notes TEXT NULL,
  created_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_mpo_product (product_name),
  KEY idx_mpo_category (category_id),
  KEY idx_mpo_market (market_id),
  KEY idx_mpo_location (location_id),
  KEY idx_mpo_observed (observed_on),
  KEY idx_mpo_unit (unit_id),
  CONSTRAINT fk_mpo_category FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mpo_market FOREIGN KEY (market_id) REFERENCES markets (id) ON DELETE SET NULL,
  CONSTRAINT fk_mpo_location FOREIGN KEY (location_id) REFERENCES locations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mpo_unit FOREIGN KEY (unit_id) REFERENCES units (id) ON DELETE RESTRICT,
  CONSTRAINT fk_mpo_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_mpo_price CHECK (price >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS saved_products (
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id),
  KEY idx_saved_products_product (product_id),
  CONSTRAINT fk_saved_products_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_products_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject VARCHAR(200) NULL,
  product_id BIGINT UNSIGNED NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  status ENUM('open','closed','archived') NOT NULL DEFAULT 'open',
  last_message_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_conversations_last_message (last_message_at),
  KEY idx_conversations_product (product_id),
  CONSTRAINT fk_conversations_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT fk_conversations_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  last_read_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (conversation_id, user_id),
  KEY idx_conversation_participants_user (user_id),
  CONSTRAINT fk_cp_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_cp_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS messages (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  conversation_id BIGINT UNSIGNED NOT NULL,
  sender_id BIGINT UNSIGNED NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_messages_conversation (conversation_id, created_at),
  KEY idx_messages_sender (sender_id),
  CONSTRAINT fk_messages_conversation FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(60) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body VARCHAR(500) NULL,
  link VARCHAR(300) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_reports (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NULL,
  reported_user_id BIGINT UNSIGNED NULL,
  reporter_id BIGINT UNSIGNED NOT NULL,
  reason VARCHAR(120) NOT NULL,
  details TEXT NULL,
  status ENUM('open','under_review','resolved','dismissed') NOT NULL DEFAULT 'open',
  resolution_note TEXT NULL,
  resolved_by BIGINT UNSIGNED NULL,
  resolved_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reports_status (status, created_at),
  KEY idx_reports_product (product_id),
  KEY idx_reports_reporter (reporter_id),
  CONSTRAINT fk_reports_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_reported_user FOREIGN KEY (reported_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_reports_resolved_by FOREIGN KEY (resolved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  audience ENUM('all','buyers','sellers') NOT NULL DEFAULT 'all',
  is_published TINYINT(1) NOT NULL DEFAULT 0,
  published_at DATETIME NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_published (is_published, published_at),
  CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NOT NULL,
  entity_id VARCHAR(64) NULL,
  metadata JSON NULL,
  ip_address VARCHAR(64) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_actor (actor_id),
  KEY idx_audit_entity (entity_type, entity_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
