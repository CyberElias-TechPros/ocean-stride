-- Enforce availability inside the same write transaction, not just in API preflight.
CREATE TRIGGER crew_available_insert BEFORE INSERT ON crew WHEN NEW.vessel_id IS NOT NULL BEGIN
 SELECT CASE WHEN (SELECT status FROM vessels WHERE id=NEW.vessel_id)='Maintenance' THEN RAISE(ABORT,'Vessel unavailable for assignment') END;
END;
CREATE TRIGGER crew_available_update BEFORE UPDATE OF vessel_id ON crew WHEN NEW.vessel_id IS NOT NULL AND NEW.vessel_id IS NOT OLD.vessel_id BEGIN
 SELECT CASE WHEN (SELECT status FROM vessels WHERE id=NEW.vessel_id)='Maintenance' THEN RAISE(ABORT,'Vessel unavailable for assignment') END;
END;
