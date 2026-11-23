import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261123104736 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "dev_gateway_charge" ("id" text not null, "reference" text not null, "amount" numeric not null, "currency_code" text not null, "status" text check ("status" in ('pending', 'approved', 'declined', 'canceled')) not null default 'pending', "capture_on_approval" boolean not null default true, "captured_amount" numeric not null default 0, "refunded_amount" numeric not null default 0, "page_token" text not null, "webhook_url" text not null, "return_url" text not null, "raw_amount" jsonb not null, "raw_captured_amount" jsonb not null default '{"value":"0","precision":20}', "raw_refunded_amount" jsonb not null default '{"value":"0","precision":20}', "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "dev_gateway_charge_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_dev_gateway_charge_deleted_at" ON "dev_gateway_charge" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "dev_gateway_charge" cascade;`);
  }

}
