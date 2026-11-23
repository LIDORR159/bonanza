import { Migration } from "@medusajs/framework/mikro-orm/migrations"

/**
 * Text search configuration for the product search index.
 *
 * The search provider queries `medusa_search_<language>` and only ships the
 * English one, which stems words by English rules. Hebrew needs no such
 * stemming, so this configuration is a copy of PostgreSQL's `simple` one.
 * `medusa-config.ts` selects it with `language: "simple"`.
 */
export class Migration20261123103800 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_ts_config WHERE cfgname = 'medusa_search_simple'
        ) THEN
          CREATE TEXT SEARCH CONFIGURATION medusa_search_simple (COPY = simple);
        END IF;
      END
      $$;
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`DROP TEXT SEARCH CONFIGURATION IF EXISTS medusa_search_simple;`)
  }
}
