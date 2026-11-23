import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123121503 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "gallery_item" ("id" text not null, "image_url" text not null, "alt" text null, "caption" text null, "is_featured" boolean not null default false, "rank" integer not null default 0, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "gallery_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gallery_item_deleted_at" ON "gallery_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_gallery_item_rank" ON "gallery_item" ("rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "review" ("id" text not null, "author_name" text not null, "rating" integer not null, "text" text not null, "date_label" text null, "source" text check ("source" in ('google', 'other')) not null default 'google', "rank" integer not null default 0, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "review_pkey" primary key ("id"), constraint review_rating_range check (rating >= 1 AND rating <= 5));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" ON "review" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_review_rank" ON "review" ("rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_group" ("id" text not null, "title" text not null, "note" text null, "rank" integer not null default 0, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_group_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_group_deleted_at" ON "service_group" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_group_rank" ON "service_group" ("rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "service_item" ("id" text not null, "group_id" text not null, "name" text not null, "description" text null, "price" integer null, "price_note" text null, "duration_minutes" integer null, "rank" integer not null default 0, "is_visible" boolean not null default true, "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "service_item_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_item_group_id" ON "service_item" ("group_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_item_deleted_at" ON "service_item" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_service_item_group_id_rank" ON "service_item" ("group_id", "rank") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "team_member" ("id" text not null, "name" text not null, "role" text null, "photo_url" text null, "instagram_url" text null, "rank" integer not null default 0, "status" text check ("status" in ('draft', 'published')) not null default 'draft', "updated_by" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "team_member_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_team_member_deleted_at" ON "team_member" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_team_member_rank" ON "team_member" ("rank") WHERE deleted_at IS NULL;`);

    this.addSql(`alter table if exists "service_item" add constraint "service_item_group_id_foreign" foreign key ("group_id") references "service_group" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table if exists "homepage_section" drop constraint if exists "homepage_section_type_check";`);

    this.addSql(`alter table if exists "homepage_section" add constraint "homepage_section_type_check" check("type" in ('hero', 'categories', 'product_rail', 'banner_slot', 'brands', 'academy', 'editorial', 'newsletter', 'info_strip', 'about', 'pricing', 'gallery', 'reviews'));`);

    this.addSql(`alter table if exists "site_setting" add column if not exists "booking_url" text null, add column if not exists "map_embed_url" text null, add column if not exists "map_link_url" text null, add column if not exists "google_reviews_url" text null, add column if not exists "google_rating" real null, add column if not exists "google_review_count" integer null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "service_item" drop constraint if exists "service_item_group_id_foreign";`);

    this.addSql(`drop table if exists "gallery_item" cascade;`);

    this.addSql(`drop table if exists "review" cascade;`);

    this.addSql(`drop table if exists "service_group" cascade;`);

    this.addSql(`drop table if exists "service_item" cascade;`);

    this.addSql(`drop table if exists "team_member" cascade;`);

    this.addSql(`alter table if exists "homepage_section" drop constraint if exists "homepage_section_type_check";`);

    this.addSql(`alter table if exists "homepage_section" add constraint "homepage_section_type_check" check("type" in ('hero', 'categories', 'product_rail', 'banner_slot', 'brands', 'academy', 'editorial', 'newsletter'));`);

    this.addSql(`alter table if exists "site_setting" drop column if exists "booking_url", drop column if exists "map_embed_url", drop column if exists "map_link_url", drop column if exists "google_reviews_url", drop column if exists "google_rating", drop column if exists "google_review_count";`);
  }

}
