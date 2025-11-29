[shortId]/
│
├── page.tsx
│
├── state/
│   ├── JobProvider.tsx
│   └── useJobActions.ts
│
└── ui/
    ├── OverviewTab.tsx
    ├── LogsTab.tsx
    ├── RecordingsTab.tsx
    └── Editable.tsx


    FILE DESCRIPTIONS

⸻

1. page.tsx

Purpose: The entry point for the Job Details page.

Contains:
	•	Page wrapper
	•	<JobProvider> context wrapper
	•	Tab switching UI
	•	Imports all UI components (Overview, Log, Recordings)

Does NOT contain:
✔ business logic
✔ API calls
✔ state handling

⸻

📁 2. state/JobProvider.tsx

Purpose: Global state manager for the job page.

It loads everything initially:
	•	Job data
	•	Job types
	•	Technicians
	•	Statuses
	•	Lead sources
	•	Call recordings

And provides global state:
	•	job, editableJob, dirty
	•	payments, percentages, parts, flags
	•	closing calculation result
	•	tab selection

Think of it like React “backend” for the job page.

⸻

📁 3. state/useJobActions.ts

Purpose: All ACTIONS & LOGIC for job operations.

Contains all functions originally inside the big file:

API Actions
	•	saveChanges()
	•	refreshExt()
	•	closeJob()

Editing helpers
	•	setField()
	•	addPaymentRow(), removePaymentRow()
	•	updatePayment()
	•	handlePercentChange()
	•	normalizePercent()

Formula engine
	•	calculateSplit()

This file is pure logic, no JSX.

⸻

📁 4. ui/OverviewTab.tsx

Purpose: Everything visible in the “Overview” tab.

Contains UI for:
	•	Customer info
	•	Phone + masked dial + refresh EXT
	•	Address (Google input)
	•	Job Type
	•	Description
	•	Technician selection + resend SMS
	•	Status dropdown
	•	Appointment date/time
	•	Closing Panel UI (payments, split, invoice, summary)

No business logic — only UI — calls actions from useJobActions.

⸻

📁 5. ui/LogsTab.tsx

Purpose: Renders job logs.

Small, clean UI-only component:
	•	Shows each log entry
	•	Shows who pasted the SMS
	•	Shows timestamps

Zero logic.

⸻

📁 6. ui/RecordingsTab.tsx

Purpose: UI for Twilio call recordings.

Includes:
	•	Reload recordings button
	•	List of recordings
	•	Audio player
	•	Download links

⸻

📁 7. ui/Editable.tsx

Small reusable component.

Used for:
	•	<input>
	•	<textarea>

No logic, just UI.

⸻

🎯 Benefits of This Structure

✔ Future changes are isolated

Changes to payments? → edit useJobActions.ts
UI adjustment to logs? → edit LogsTab.tsx
Add new fields? → edit only OverviewTab.tsx

✔ Safer to modify

You no longer risk breaking the whole page.

✔ Much easier debugging

State = one place
Logic = one place
UI = one place

✔ Clean foundation for adding features

This is ready for:
	•	AI assistant help
	•	Feature branches
	•	Live updates
	•	Code reviews
