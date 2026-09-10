-- Existing assignments and pending attempts keep their original rule engine.
ALTER TABLE assignment_steps ADD COLUMN rules_version integer NOT NULL DEFAULT 1 CHECK (rules_version IN (1,2));
ALTER TABLE attempts ADD COLUMN rules_version integer NOT NULL DEFAULT 1 CHECK (rules_version IN (1,2));
ALTER TABLE results ADD COLUMN rules_version integer NOT NULL DEFAULT 1 CHECK (rules_version IN (1,2));
ALTER TABLE results ADD COLUMN stars integer CHECK (stars BETWEEN 0 AND 3);
ALTER TABLE results ADD COLUMN star_basis text NOT NULL DEFAULT 'legacy-v1';
-- Preserve the exact stars the deployed v1 progress page awarded historically.
UPDATE results SET stars=CASE WHEN percent=100 THEN 3 WHEN percent>=60 THEN 2 WHEN percent>0 THEN 1 ELSE 0 END;
