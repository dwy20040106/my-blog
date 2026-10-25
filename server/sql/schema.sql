-- ============================================================
-- my-blog MySQL 建表脚本（MySQL 5.7 / 8.0 均可）
--
-- 使用方式（宝塔面板）：
--   1. 宝塔 → 数据库 → 添加数据库（库名、用户名、密码记下来）
--      字符集选择 utf8mb4（非常重要，否则 emoji 会乱码/报错）
--   2. 打开 phpMyAdmin，选中这个库 → 导入 → 上传本文件 → 执行
--      或者命令行：mysql -u用户名 -p 库名 < server/sql/schema.sql
--   3. 把库名/用户名/密码填到 server/.env
--
-- 脚本可重复执行（CREATE TABLE IF NOT EXISTS）。
-- ============================================================

-- 如果你还没建库，可以取消下面两行注释（已有库就别执行）：
-- CREATE DATABASE IF NOT EXISTS `my_blog` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `my_blog`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================= 1. 评论表 =========================
-- 前端字段：id / article_key / content / parent_id / root_id / created_at
-- author 目前前端没有输入框，默认写「匿名」，以后想加昵称直接传即可。
CREATE TABLE IF NOT EXISTS `comments` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `article_key` VARCHAR(255)    NOT NULL COMMENT '文章路径，如 /posts/2026/10/09/第一篇日记',
  `author`      VARCHAR(50)     NOT NULL DEFAULT '匿名' COMMENT '昵称',
  `ip`          VARCHAR(45)     NOT NULL DEFAULT '' COMMENT '评论者 IP（用于判断是否本人）',
  `content`     TEXT            NOT NULL COMMENT '评论正文',
  `parent_id`   BIGINT UNSIGNED DEFAULT NULL COMMENT '直接父评论 id（顶级评论为 NULL）',
  `root_id`     BIGINT UNSIGNED DEFAULT NULL COMMENT '所属顶级评论 id（用于折叠，顶级评论为 NULL）',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_comments_article_created` (`article_key`, `created_at`),
  KEY `idx_comments_ip` (`ip`),
  KEY `idx_comments_parent` (`parent_id`),
  KEY `idx_comments_root` (`root_id`),
  CONSTRAINT `fk_comments_parent`
    FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '文章评论（支持无限层级回复）';

-- ========================= 2. 备忘录表 =========================
-- 前端字段：id / article_key / category / content / rating / is_deleted / created_at
CREATE TABLE IF NOT EXISTS `notes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `article_key` VARCHAR(255)    NOT NULL COMMENT '所属页面路径，如 /note',
  `category`    VARCHAR(50)     NOT NULL DEFAULT '默认' COMMENT '分组名',
  `content`     TEXT            NOT NULL COMMENT '备忘内容',
  `rating`      TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '星级 1~5，用于排序',
  `is_deleted`  TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '软删除：0 正常 / 1 已删除',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_notes_article` (`article_key`, `is_deleted`, `rating`),
  KEY `idx_notes_category` (`category`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '备忘录 / 星级清单';

-- ========================= 3. 点赞表 =========================
-- 一个 IP 对同一篇文章只能赞一次；每个 IP 每天最多赞 10 次（由接口校验）。
CREATE TABLE IF NOT EXISTS `likes` (
  `id`          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `article_key` VARCHAR(255)    NOT NULL COMMENT '被点赞的文章路径',
  `ip`          VARCHAR(45)     NOT NULL COMMENT '点赞者 IP',
  `created_at`  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '点赞时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_likes_article_ip` (`article_key`, `ip`),
  KEY `idx_likes_ip_created` (`ip`, `created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci
  COMMENT = '文章点赞（按 IP 去重，每日限 10 次）';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 建表完成后可执行下面的语句检查：
--   SHOW TABLES;
--   DESC comments;
--   DESC notes;
--   DESC likes;
-- ============================================================
