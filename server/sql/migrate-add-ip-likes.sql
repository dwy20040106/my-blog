-- ============================================================
-- 已有数据库升级脚本（新装库直接用 schema.sql，不需要执行本文件）
--
-- 本次变更：
--   1. comments 增加 ip 字段 + 索引（用于「只能删除自己的评论」）
--   2. 新增 likes 表（按 IP 去重，每 IP 每天最多 10 次）
--
-- 执行方式（宝塔）：
--   数据库 → phpMyAdmin → 选中库 → SQL → 粘贴本文件 → 执行
--   或者：mysql -u用户名 -p 库名 < server/sql/migrate-add-ip-likes.sql
--
-- ⚠️ 只需要执行一次；重复执行会提示字段/索引已存在。
--    升级前的旧评论 ip 为空，这些评论只有配置了 ADMIN_TOKEN 的管理员能删。
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE `comments`
  ADD COLUMN `ip` VARCHAR(45) NOT NULL DEFAULT '' COMMENT '评论者 IP（用于判断是否本人）' AFTER `author`,
  ADD INDEX `idx_comments_ip` (`ip`);

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
