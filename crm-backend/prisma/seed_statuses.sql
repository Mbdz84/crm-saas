INSERT INTO "JobStatus" (id, name, "order", active)
VALUES
  (gen_random_uuid(), 'Accepted', 1, true),
  (gen_random_uuid(), 'In Progress', 2, true),
  (gen_random_uuid(), 'Appointment', 3, true),
  (gen_random_uuid(), 'On Hold', 4, true),
  (gen_random_uuid(), 'Billing', 5, true),
  (gen_random_uuid(), 'Closed', 6, true),
  (gen_random_uuid(), 'Pending Close', 7, true),
  (gen_random_uuid(), 'Canceled', 8, true),
  (gen_random_uuid(), 'Pending Cancel', 9, true),
  (gen_random_uuid(), 'Estimate', 10, true),
  (gen_random_uuid(), 'Follow Up', 11, true);