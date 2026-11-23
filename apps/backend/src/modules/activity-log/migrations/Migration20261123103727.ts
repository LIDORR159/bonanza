import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123103727 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "activity_log_entry" ("id" text not null, "actor_type" text not null default 'system', "actor_id" text null, "action" text not null, "resource_type" text not null, "resource_id" text null, "summary" text null, "details" jsonb null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "activity_log_entry_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_activity_log_entry_deleted_at" ON "activity_log_entry" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_activity_log_entry_resource_type_resource_id" ON "activity_log_entry" ("resource_type", "resource_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_activity_log_entry_actor_id" ON "activity_log_entry" ("actor_id") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "activity_log_entry" cascade;`);
  }

}
