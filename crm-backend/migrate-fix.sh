#!/bin/bash

echo "🔧 Starting baseline..."

MIGRATIONS=(
  20251113191652_init
  20251114022019_add_company_fields
  20251114030600_add_user_active
  20251114050516_add_company_fields
  20251114053323_add_notify_toggle
  20251114054417_add_user_phone
  20251114223045_add_job_type_model
  20251114230634_add_jobtype_company_unique
  20251115003006_clean_schema_update
  20251115160202_add_jobtype_active
  20251115170932_add_short_id
  20251115214741_fix_technician_relation
  20251115231709_restore_status_field
  20251116021726_add_jobstatus_color_locked
  20251123000432_add_job_closing
  20251124065249_add_job_logs
  20251125024623_add_masked_calls
  20251125143843_add_job_recordings
  20251126184259_add_recording_sid
  20251126211322_make_recording_sid_required
  20251126212957_add_recording_fields
  20251126234828_add_parent_call_sid
  20251128085029_add_payment_totals
)

for MIG in "${MIGRATIONS[@]}"; do
  echo "📝 Marking migration applied: $MIG"
  npx prisma migrate resolve --applied "$MIG"
done

echo "✨ Baseline complete."
echo "🚀 Deploying remaining migrations..."

DATABASE_URL="postgresql://postgres:axvTvVCNPeM5iQQD@db.ubribhvkoflelegwjmyf.supabase.co:5432/postgres" \
npx prisma migrate deploy

echo "🎉 Completed!"