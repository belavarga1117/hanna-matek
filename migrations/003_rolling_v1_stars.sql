-- A retiring v1 process may still INSERT during a rolling service handover.
-- It omits the new columns, so freeze its original award at insertion too.
-- Explicit v2 NULL stars remain unmeasured and are never changed by this trigger.
CREATE FUNCTION preserve_v1_result_stars() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rules_version=1 AND NEW.stars IS NULL THEN
    NEW.stars := CASE WHEN NEW.percent=100 THEN 3 WHEN NEW.percent>=60 THEN 2 WHEN NEW.percent>0 THEN 1 ELSE 0 END;
    NEW.star_basis := 'legacy-v1';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER preserve_v1_result_stars_before_insert
BEFORE INSERT ON results FOR EACH ROW EXECUTE FUNCTION preserve_v1_result_stars();

-- Catch a v1 save committed between the two additive migration transactions.
UPDATE results SET stars=CASE WHEN percent=100 THEN 3 WHEN percent>=60 THEN 2 WHEN percent>0 THEN 1 ELSE 0 END, star_basis='legacy-v1' WHERE rules_version=1 AND stars IS NULL;
