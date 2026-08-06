-- Agrega un tercer sector combinado ("IT/OT") a los comerciales, ademas de
-- los dos existentes (OT, IT).

ALTER TABLE comerciales DROP CONSTRAINT comerciales_sector_check;
ALTER TABLE comerciales ADD CONSTRAINT comerciales_sector_check CHECK (sector IN ('OT', 'IT', 'IT/OT'));
