-- Volltext-Suche auf fragrances
-- Kombiniert name, description, category in einem tsvector für schnelle FTS-Queries.

ALTER TABLE fragrances
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Initialbefüllung
UPDATE fragrances
SET search_vector = to_tsvector(
  'german',
  coalesce(name, '') || ' ' ||
  coalesce(description, '') || ' ' ||
  coalesce(category, '')
);

-- GIN-Index für FTS-Performance
CREATE INDEX IF NOT EXISTS idx_fragrances_search_vector
  ON fragrances USING GIN(search_vector);

-- Trigger: search_vector nach jedem INSERT / UPDATE automatisch aktualisieren
CREATE OR REPLACE FUNCTION fragrances_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'german',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.category, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fragrances_search_vector_trig ON fragrances;
CREATE TRIGGER fragrances_search_vector_trig
  BEFORE INSERT OR UPDATE OF name, description, category
  ON fragrances
  FOR EACH ROW EXECUTE FUNCTION fragrances_search_vector_update();

-- Profile-Suche (username, display_name, bio)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE profiles
SET search_vector = to_tsvector(
  'german',
  coalesce(username, '') || ' ' ||
  coalesce(display_name, '') || ' ' ||
  coalesce(bio, '')
);

CREATE INDEX IF NOT EXISTS idx_profiles_search_vector
  ON profiles USING GIN(search_vector);

CREATE OR REPLACE FUNCTION profiles_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'german',
    coalesce(NEW.username, '') || ' ' ||
    coalesce(NEW.display_name, '') || ' ' ||
    coalesce(NEW.bio, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_search_vector_trig ON profiles;
CREATE TRIGGER profiles_search_vector_trig
  BEFORE INSERT OR UPDATE OF username, display_name, bio
  ON profiles
  FOR EACH ROW EXECUTE FUNCTION profiles_search_vector_update();
