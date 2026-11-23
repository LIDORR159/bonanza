# Seed pictures

The seed scripts upload these through Medusa's file module, so they end up
wherever uploads are configured to go (local disk, MinIO or R2).

## Demo product images (this folder)

Original illustrations for the development catalog, drawn by
`scripts/generate-demo-images.mjs` at the repository root. Re-run that script
to regenerate them. They are not photographs of real products and carry no
third-party rights. Used by `seed-demo.ts`.

## `site/`

- `hero.jpg`, `about.jpg`: the photographs of the home page's hero and About
  sections. `seed-content.ts` uploads them on a first install. `medusa build`
  does not copy pictures into `.medusa/server`, so a production image has to
  copy this folder next to the compiled script for that to happen; without
  it the seed logs a warning and creates the two sections without a picture.
- `gallery-*.webp`, `team-*.webp`: grey placeholders marked SAMPLE for the
  demo gallery and team, drawn by `site/generate-placeholders.mjs`. Used by
  `seed-demo.ts` only.
