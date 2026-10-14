# Lume

**Lumescroll toward a brighter thought.** Lume is a vertical, mobile-first feed of passages from Castalia faculty authors, connected to their source texts in Bibliotech.

## Local preview

From this directory, run `python3 -m http.server 8000 --directory docs` and open `http://localhost:8000`. The feed ranks locally from likes, saves, shares, source opens, completed reads, dwell, skips, and dismissed topics. Older signals fade over time, and discovery slots introduce less-seen faculty and topics. The “A question to carry” is an editorial prompt, not a quotation or statement by the attributed faculty member.

Member sign-in uses Castalia Google OAuth. Member likes and reading events sync to the Castalia Supabase project; faculty reactions and written peer reviews go to separate tables and do not enter member preference ranking. The anonymous key in `docs/runtime-config.js` is the project’s public Supabase anon key; row-level security protects member data. The production migration is recorded as applied in the Castalia project.

## Publish

GitHub Pages publishes `docs/`; the custom domain `lume.castalia.institute` is configured for HTTPS. The GitHub Actions workflow deploys every push to `main`.

The verified source material is exported in `data/quotes.json` and copied to `docs/data/quotes.json`. When refreshing it, copy both files. The portraits, ambient audio, Supabase client, and favicon are included under `docs/` so deployment does not depend on sibling workspaces.

## Faculty posts

The migration also prepares faculty-authored Lume posts, ordered source passages, drafts/publication, and peer reviews. Faculty posting and review of published posts are supported by the database schema; the current feed UI presents sourced faculty passages and supports faculty review on those quote-based cards. A future authoring surface can create multi-passage Lume posts.
