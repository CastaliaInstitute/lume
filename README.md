# Lume

**Lumescroll toward a brighter thought.** Lume is a vertical, mobile-first feed of passages from Castalia faculty authors, connected to their source texts in Bibliotech.

## Local preview

From this directory, run `python3 -m http.server 8000 --directory docs` and open `http://localhost:8000`. The feed ranks locally from likes, saves, shares, source opens, completed reads, dwell, skips, and dismissed topics. Older signals fade over time, and discovery slots introduce less-seen faculty and topics. The “A question to carry” is an editorial prompt, not a quotation or statement by the attributed faculty member.

Member sign-in uses Castalia Google OAuth. Member likes and reading events sync to the Castalia Supabase project; faculty reactions and written peer reviews go to separate tables and do not enter member preference ranking. Signed-in members can comment on published feed cards and remove their own comments. Comments do not affect ranking. Ambient sound includes birdsong plus locally synthesized rain, ocean, pine wind, and fireplace soundscapes; sound starts only after the reader turns it on. The anonymous key in `docs/runtime-config.js` is the project’s public Supabase anon key; row-level security protects member data. Production migrations are recorded as applied in the Castalia project.

## Publish

GitHub Pages publishes `docs/`; the custom domain `lume.castalia.institute` is configured for HTTPS. The GitHub Actions workflow deploys every push to `main`.

The verified source material is exported in `data/quotes.json` and copied to `docs/data/quotes.json`. When refreshing it, copy both files. The portraits, birdsong audio, Supabase client, and favicon are included under `docs/` so deployment does not depend on sibling workspaces. Bust sprite sheets are cropped to one randomly selected portrait view per card and placed in a corner.

## Faculty posts

The migration also prepares faculty-authored Lume posts, ordered source passages, drafts/publication, and peer reviews. Faculty posting and review of published posts are supported by the database schema; the current feed UI presents sourced faculty passages and supports faculty review on those quote-based cards. A future authoring surface can create multi-passage Lume posts.
