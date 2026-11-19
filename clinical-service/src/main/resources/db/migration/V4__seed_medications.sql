-- Test data for the presentation. Doses are illustrative, not clinical guidance.
INSERT INTO medication (id, name, unit, maximum_dose)
SELECT * FROM (
    SELECT '6a1f6d0e-1b1a-4c55-9c1e-000000000001' AS id, 'Dipyrone (Dipirona)' AS name, 'mg' AS unit, 1000.00 AS maximum_dose UNION ALL
    SELECT '6a1f6d0e-1b1a-4c55-9c1e-000000000002', 'Epinephrine (Adrenalina)', 'mg', 1.00 UNION ALL
    SELECT '6a1f6d0e-1b1a-4c55-9c1e-000000000003', 'Acetylsalicylic acid (AAS)', 'mg', 300.00 UNION ALL
    SELECT '6a1f6d0e-1b1a-4c55-9c1e-000000000004', 'Saline solution 0.9% (Soro fisiologico)', 'mL', 1000.00 UNION ALL
    SELECT '6a1f6d0e-1b1a-4c55-9c1e-000000000005', 'Glucose 50% (Glicose)', 'mL', 50.00
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM medication m WHERE m.id = seed.id);
