# Lume

**Lumescroll toward a brighter thought.** Lume is a vertical, mobile-first feed of passages from Castalia faculty authors, connected to their source texts in Bibliotech.

## Local preview

From this directory, run `python3 -m http.server 8000 --directory docs` and open `http://localhost:8000`. The feed ranks locally from likes, saves, shares, source opens, completed reads, dwell, skips, and dismissed topics. Older signals fade over time, and discovery slots introduce less-seen faculty and topics. Published faculty-authored Lumes join sourced quote cards in the same ranked feed; post tags come from linked source passages. Every starter passage includes a short, editorially written context note. Context notes are clearly labeled and are not presented as the attributed author’s words.

Member sign-in uses Castalia Google OAuth. Member likes and reading events sync to the Castalia Supabase project; faculty reactions and written peer reviews go to separate tables and do not enter member preference ranking. Signed-in members can comment on published feed cards and remove their own comments. Comments do not affect ranking. Every post carries its own authored ambient sound (birds, rain, ocean, wind, or fire); readers can play or pause it, and it stops when they leave that post. The anonymous key in `docs/runtime-config.js` is the project’s public Supabase anon key; row-level security protects member data. Production migrations are recorded as applied in the Castalia project.

## Publish

GitHub Pages publishes `docs/`; the custom domain `lume.castalia.institute` is configured for HTTPS. The GitHub Actions workflow deploys every push to `main`.

The verified source material is exported in `data/quotes.json` and copied to `docs/data/quotes.json`. When refreshing it, copy both files. The portraits, ambience audio, Supabase client, and favicon are included under `docs/` so deployment does not depend on sibling workspaces. Transparent bust cutouts are placed low in alternating card corners, with the quote and source area kept clear. Topic-led abstract backgrounds and hand-drawn Emojinq glyph watermarks add atmosphere behind the text; the generated background assets are local to `docs/media/`.

## Faculty profiles and posts

The searchable Faculty directory pages through Castalia’s ranked faculty catalog. Every faculty record resolves to a public profile that lists its published sourced passages and faculty-authored Lumes, with Bibliotech source links. The profile page reads current records from Supabase, so new eligible faculty do not need a frontend rebuild. The public directory can expose profiles, but it does not provision authentication identities; account linking must be performed through Castalia’s trusted faculty onboarding.

The migration also prepares faculty-authored Lume posts, ordered source passages, drafts/publication, and peer reviews. Faculty posting and review of published posts are supported by the database schema; the current feed UI presents sourced faculty passages and supports faculty review on those quote-based cards. The local composer builds private Original or Template drafts; it does not publish them.

## Post conversations

Each published quote card or faculty Lume can lazily open one Matrix room for a threaded conversation. The post is the room's opening context; readers use Matrix's thread reply action to keep replies attached to it. The room mapping uses a deterministic Matrix alias, so repeat clicks return to the same room and unused posts do not create rooms. Lume quick comments remain in Supabase; the dialog labels this boundary before sending readers to Element at `element.castalia.institute`. The Inbox lists only rooms the signed-in member opened, recorded through `lume_discussion_members`.

To enable this path, apply `20261014030000_lume_matrix_discussions.sql` and `20261014040000_lume_discussion_members.sql`, then deploy `supabase/functions/lume-post-room` with the Supabase project secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus `MATRIX_SERVER`, `MATRIX_DOMAIN`, `MATRIX_ADMIN_USER`, and `MATRIX_ADMIN_PASSWORD`. Keep the Matrix admin password in Edge Function secrets only. The function creates non-federated public rooms for published Lume content, only after an authenticated member requests a thread. Lume OAuth does not yet provision or sign in a Matrix account. These files are local changes; deployment and secret configuration have not been performed.

## Private editorial drafts

A local-only composer provides **Original** and **Template** post formats, a timed 12-second portrait motion preview, Bibliotech source fields, an optional music-room composition link, and an automatic per-post ambience cue. The preview reveals the quotation, then the byline and reflection; faculty bust cutouts animate in a lower corner when available. Drafts store this motion treatment but not a rendered video file. The feed also reveals each full quotation as one block and animates the active card’s artwork and portrait. Its coverage queue shows the ranked faculty catalog, published passage availability, and existing Lume coverage; available verified passages can prefill a template without inventing text. Drafts stay in this browser's local storage; export JSON to carry a draft into editorial review. The composer is outside `docs/`, has no publishing action, and is not deployed to the public site.

Run the local preview from the repository root, bound to this machine:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/editorial/create.html` for drafts or `http://127.0.0.1:8000/docs/` for the public-site preview.
