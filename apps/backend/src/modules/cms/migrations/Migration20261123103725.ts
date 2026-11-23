import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123103725 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "newsletter_subscriber" drop constraint if exists "newsletter_subscriber_email_unique";`);
    this.addSql(`alter table if exists "homepage_section" drop constraint if exists "homepage_section_key_unique";`);
    this.addSql(`alter table if exists "content_page" drop constraint if exists "content_page_slug_unique";`);
    this.addSql(`create table if not exists "banner" ("id" text not null, "placement" text check ("placement" in ('home_primary', 'home_secondary', 'catalog_top', 'announcement')) not null default 'home_primary', "title" text not null, "subtitle" text null, "image_url" text null, "mobile_image_url" text null, "image_alt" text null, "target_url" text null, "cta_label" text null, "starts_at" timestamptz null, "ends_at" timestamptz null, "is_enabled" boolean not null default false, "rank" integer not null default 0, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "banner_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_deleted_at" ON "banner" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_banner_placement_rank" ON "banner" ("placement", "rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "content_page" ("id" text not null, "slug" text not null, "title" text not null, "body" text not null default '', "status" text check ("status" in ('draft', 'published')) not null default 'draft', "publish_at" timestamptz null, "published_at" timestamptz null, "meta_title" text null, "meta_description" text null, "canonical_url" text null, "og_image_url" text null, "include_in_sitemap" boolean not null default true, "revision" integer not null default 1, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "content_page_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_content_page_deleted_at" ON "content_page" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_content_page_slug_unique" ON "content_page" ("slug") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "homepage_section" ("id" text not null, "type" text check ("type" in ('hero', 'categories', 'product_rail', 'banner_slot', 'brands', 'academy', 'editorial', 'newsletter')) not null, "key" text not null, "title" text null, "subtitle" text null, "body" text null, "image_url" text null, "mobile_image_url" text null, "image_alt" text null, "cta_label" text null, "cta_url" text null, "secondary_cta_label" text null, "secondary_cta_url" text null, "settings" jsonb null, "rank" integer not null default 0, "is_visible" boolean not null default true, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "publish_at" timestamptz null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "homepage_section_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_homepage_section_deleted_at" ON "homepage_section" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_homepage_section_key_unique" ON "homepage_section" ("key") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_homepage_section_rank" ON "homepage_section" ("rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "navigation_item" ("id" text not null, "menu" text check ("menu" in ('header', 'footer')) not null, "label" text not null, "link_type" text check ("link_type" in ('custom', 'category', 'page', 'brand')) not null default 'custom', "link_ref" text null, "url" text null, "parent_id" text null, "rank" integer not null default 0, "is_visible" boolean not null default true, "open_in_new_tab" boolean not null default false, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "navigation_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_deleted_at" ON "navigation_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_navigation_item_menu_rank" ON "navigation_item" ("menu", "rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "newsletter_subscriber" ("id" text not null, "email" text not null, "status" text check ("status" in ('subscribed', 'unsubscribed')) not null default 'subscribed', "consented_at" timestamptz not null, "source" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "newsletter_subscriber_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_deleted_at" ON "newsletter_subscriber" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_newsletter_subscriber_email_unique" ON "newsletter_subscriber" ("email") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "site_setting" ("id" text not null, "store_name" text not null default 'BONANZA', "tagline" text null, "title_template" text not null default '%s | BONANZA', "default_meta_title" text not null default 'BONANZA', "default_meta_description" text null, "default_og_image_url" text null, "contact_phone" text null, "contact_whatsapp" text null, "contact_email" text null, "address" text null, "opening_hours" text null, "instagram_url" text null, "facebook_url" text null, "tiktok_url" text null, "youtube_url" text null, "newsletter_enabled" boolean not null default true, "free_shipping_threshold" integer null, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "site_setting_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_site_setting_deleted_at" ON "site_setting" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "banner" cascade;`);

    this.addSql(`drop table if exists "content_page" cascade;`);

    this.addSql(`drop table if exists "homepage_section" cascade;`);

    this.addSql(`drop table if exists "navigation_item" cascade;`);

    this.addSql(`drop table if exists "newsletter_subscriber" cascade;`);

    this.addSql(`drop table if exists "site_setting" cascade;`);
  }

}
