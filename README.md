# Lume

**Lumescroll toward a brighter thought.** Lume is a vertical, mobile-first feed of passages from Castalia faculty authors, connected to their source texts in Bibliotech.

## Local preview

From this directory, run `python3 -m http.server 8000 --directory docs` and open `http://localhost:8000`. The feed ranks locally from likes, saves, shares, source opens, completed reads, dwell, skips, and dismissed topics. Older signals fade over time, and discovery slots introduce less-seen faculty and topics. Published faculty-authored Lumes are loaded from `lume_posts` in Supabase, joined to their faculty and source passages, and refreshed when published rows change; the bundled JSON provides the curated quote-card fallback. Every starter passage includes a short, editorially written context note. Context notes are clearly labeled and are not presented as the attributed author’s words.

Member sign-in uses Castalia Google OAuth. Member likes and reading events sync to the Castalia Supabase project; faculty reactions and written peer reviews go to separate tables and do not enter member preference ranking. Signed-in members can comment on published feed cards and remove their own comments. Comments do not affect ranking. Every post carries its own authored ambient sound (birds, rain, ocean, wind, or fire); readers can play or pause it, and it stops when they leave that post. The anonymous key in `docs/runtime-config.js` is the project’s public Supabase anon key; row-level security protects member data. The core Lume tables and the HTML5 post fields are present in the Castalia database.

## Publish

GitHub Pages publishes `docs/`; the custom domain `lume.castalia.institute` is configured for HTTPS. The GitHub Actions workflow deploys every push to `main`.

The verified source material is exported in `data/quotes.json` and copied to `docs/data/quotes.json`. When refreshing it, copy both files. The portraits, ambience audio, Supabase client, and favicon are included under `docs/` so deployment does not depend on sibling workspaces. Transparent bust cutouts are placed low in alternating card corners, with the quote and source area kept clear. Twelve individual passage illustrations give the featured posts distinct art, each paired with a local transparent author bust. Additional bust cutouts for Philip K. Dick, John McCarthy, John Maynard Keynes, Oliver Sacks, Stephen Jay Gould, Ayn Rand, Carl Jung, James Baldwin, Aldous Huxley, Isaac Asimov, Kurt Vonnegut, George Kelly, Stafford Beer, Edward T. Hall, George A. Miller, John Maynard Smith, Julian Huxley, Ernst Haeckel, Wolfgang Pauli, Francis Bacon, R. D. Laing, Jun’ichirō Tanizaki, Jacques Monod, and Anna Freud support faculty-authored database posts; portraits are contained without stretching. Each post links to a reusable, playable musical motif in the Castalia Music Room. The SVG illustrations and busts live under `docs/media/art/` and `docs/faculty/busts/`.

## Faculty profiles and posts

The searchable Faculty directory pages through Castalia’s ranked faculty catalog. Every faculty record resolves to a public profile that lists its published sourced passages and faculty-authored Lumes, with Bibliotech source links. The profile page reads current records from Supabase, so new eligible faculty do not need a frontend rebuild. The public directory can expose profiles, but it does not provision authentication identities; account linking must be performed through Castalia’s trusted faculty onboarding.

The post schema supports private drafts and published Lumes. Faculty posting and peer review are protected by row-level security. The local composer can save a draft on this device or, after Castalia sign-in, save it privately to `lume_posts`; there is no publish action.

The private composer generates portrait backgrounds with fal FLUX.1 Schnell with freeform visual direction across photorealistic, painterly, documentary, printmaking, collage, archival, surreal, and abstract styles. The Supabase Edge Function checks Castalia sign-in and the faculty, admin, or inquisitor role before using the server-side `FAL_KEY`; the key never reaches the browser. Generated still images are downloaded into the local draft because fal media URLs expire. Editors may also animate a generated still into a five-second muted Kling video; this uses paid fal video credits and the final clip syncs to private Castalia storage with the draft. The generated still is retained as a private poster image and remains visible while the video loads, pauses, or is disabled for reduced motion; `20261023200605_lume_video_posters.sql` adds its storage path and read policy. Text remains editable as HTML and supports word-rise, fade-up, type-on, blur-in, float-in, letter-spacing unfold, pulse, or still treatments. To configure the key, run `tools/setup-lume-fal.sh` from this repository and paste the key from your fal dashboard into the hidden prompt. Deploy the function with `supabase functions deploy lume-generate-art --project-ref pilmscrodlitdrygabvo`.

## Post conversations

Each published quote card or faculty Lume can lazily open one Matrix room for a threaded conversation. The post is the room's opening context; readers use Matrix's thread reply action to keep replies attached to it. The room mapping uses a deterministic Matrix alias, so repeat clicks return to the same room and unused posts do not create rooms. Lume quick comments remain in Supabase; the dialog labels this boundary before sending readers to Element at `element.castalia.institute`. The Inbox lists only rooms the signed-in member opened, recorded through `lume_discussion_members`.

To enable this path, apply `20261014030000_lume_matrix_discussions.sql` and `20261014040000_lume_discussion_members.sql`, then deploy `supabase/functions/lume-post-room` with the Supabase project secrets `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, plus `MATRIX_SERVER`, `MATRIX_DOMAIN`, `MATRIX_ADMIN_USER`, and `MATRIX_ADMIN_PASSWORD`. Keep the Matrix admin password in Edge Function secrets only. The function creates non-federated public rooms for published Lume content, only after an authenticated member requests a thread. Lume OAuth does not yet provision or sign in a Matrix account. These files are local changes; deployment and secret configuration have not been performed.

## Private editorial drafts

A private-draft composer at `/editorial/create.html` provides **Original** and **Template** post formats, a timed 12-second portrait motion preview, Bibliotech source fields, local symbolic SVGs, fal FLUX.1 Schnell generation with freeform art direction across cinematic, photoreal, documentary, macro, painterly, impressionist, collage, woodcut, botanical, illustrative, dreamlike 3D, archival, surreal, and abstract styles, a reusable Music Room motif link, and an automatic per-post ambience cue. The preview reveals the quotation, then the byline and reflection; author-specific bust cutouts animate in a lower corner when available; ordinary profile photos are not substituted for transparent busts. Posts can use an image or looping video background; a fal-generated still can be animated into a muted five-second Kling clip. Text remains HTML and can use word-rise, fade-up, type-on, blur-in, float-in, letter-spacing unfold, pulse, or still motion. Video generation takes a separate optional camera/environment motion direction, saved with the draft. Local video previews are limited to 2 MB for browser drafts; syncing a draft uploads its selected image or video to Castalia storage (50 MB maximum) and saves the stable media URL with the database post. Draft media is stored in a private bucket and signed for its owner; the feed signs media only for published posts. Uploads require a signed-in inquisitor editor, faculty, or admin account. Inquisitor access is limited to creating and editing private drafts; it cannot publish. Apply `20261018000000_lume_inquisitor_drafts.sql` to let inquisitor editors prepare private drafts without publishing. Apply `20261016000000_lume_video_and_animation_support.sql` to enable media uploads and the blur-in animation, then `20261017000000_lume_private_post_media.sql` to keep draft media private and sign access only for its owner or published feed posts; `20261014060000_lume_dynamic_html5_posts.sql` provides the base HTML5 post fields. The feed also reveals each full quotation as one block and animates the active card’s artwork and portrait. Its coverage queue shows the ranked faculty catalog, published passage availability, and existing Lume coverage; available verified passages can prefill a template without inventing text. Local drafts stay in this browser's storage; export JSON to carry them into review. Database drafts remain private under the authenticated author's account. The composer is served from `/editorial/create.html` and creates only local or private database drafts; no publish action exists.

Run the local preview from the repository root, bound to this machine:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/editorial/create.html` for drafts or `http://127.0.0.1:8000/docs/` for the public-site preview.

## Local FLUX Schnell backgrounds

On Apple Silicon, install the MLX generator once with `uv tool install --python 3.13 mflux`. The first generation downloads a public, 4-bit FLUX.1 Schnell checkpoint (about 9.6 GB) into the Hugging Face cache; no hosted image-generation API or per-image fee is involved. Generate a portrait background with:

```sh
tools/generate-lume-background.sh \
  "A quiet symbolic forest at dusk, painterly, rich emerald and muted gold, open dark space through the center for legible quotation text, no words, no people" \
  /tmp/lume-forest.png 42
```

The default output is 768×1360 at four steps. Set `LUME_FLUX_WIDTH`, `LUME_FLUX_HEIGHT`, or `LUME_FLUX_STEPS` to change those defaults, and `MFLUX_GENERATE` if the MFLUX executable is outside `PATH`. Choose the output in the private composer’s generated background field; it optimizes the image and stores it with the local draft and JSON export. The FLUX model is Apache-2.0; the quantized checkpoint is a community MFLUX-format conversion. The SVG composer remains available for quick, repeatable drafts.
