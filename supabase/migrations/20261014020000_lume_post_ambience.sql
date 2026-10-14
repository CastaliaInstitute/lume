-- Ambient sound is authored into a Lume post; feed readers only play or pause it.
ALTER TABLE public.lume_posts
  ADD COLUMN IF NOT EXISTS ambience text NOT NULL DEFAULT 'forest'
  CHECK (ambience IN ('forest', 'rain', 'ocean', 'wind', 'fire'));
