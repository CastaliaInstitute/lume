# Lume

**Lumescroll toward a brighter thought.** Lume is a vertical, mobile-first stream of passages from Castalia faculty authors, connected to their source texts in Bibliotech.

## Local preview

From this directory, run `python3 -m http.server 8000 --directory docs` and open `http://localhost:8000`. The feed is static but includes a local recommendation loop. It learns from likes, saves, shares, source opens, completed reads, dwell, skips, and dismissed topics. Signals stay in this browser's local storage in this prototype; they are not uploaded or used to train a model. Twenty percent of feed slots are reserved for discovery, with older behavior gradually decaying.

The “A question to carry” is an editorial prompt, not a quotation or statement by the attributed faculty member.

## Publish

GitHub Pages publishes `docs/`; `docs/CNAME` sets `lume.castalia.institute`. DNS must point to `castaliainstitute.github.io` and the custom domain must be enabled in repository Pages settings.

The current verified source material is exported in `data/quotes.json` and copied to `docs/data/quotes.json`. When refreshing the dataset, copy both. Portraits and ambient audio are included under `docs/` so deployment does not depend on sibling workspaces.

## Member and faculty features

The SQL migration in `supabase/migrations/` prepares faculty-authored Lume posts, source quote links, drafts/publication, and likes. The deployed prototype currently keeps reactions local; member sign-in, shared counts, faculty authoring, and cross-device recommendations require the Castalia Supabase project to apply the migration and connect an authenticated client. Faculty peer reactions should remain a separate editorial signal and should not be blended into member preference weights.
