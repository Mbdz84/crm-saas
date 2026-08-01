"use client";

/* ------------------------------------------------------------
   Live, miniature FULL job page used on the Permissions tab so
   an admin can see what a technician sees as they flip toggles.
   When a permission is OFF, the affected element is kept visible
   but covered in a light-red tint at 50% opacity (instead of
   being hidden), so it's obvious what each toggle controls.
   Everything here is example data — it is never saved.
------------------------------------------------------------ */

/* Wrap an element so it dims + turns light-red when `off`. */
function Restrict({
  off,
  inline,
  children,
}: {
  off: boolean;
  inline?: boolean;
  children: React.ReactNode;
}) {
  if (!off) return <>{children}</>;
  const overlay = (
    <span className="absolute inset-0 bg-red-300/70 rounded pointer-events-none" />
  );
  if (inline) {
    return (
      <span className="relative inline-block rounded">
        <span className="opacity-50">{children}</span>
        {overlay}
      </span>
    );
  }
  return (
    <div className="relative rounded">
      <div className="opacity-50">{children}</div>
      {overlay}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="font-semibold mb-0.5 text-[11px]">{children}</div>;
}

/* Read-only faux field */
function RO({
  value,
  placeholder,
  select,
}: {
  value?: string;
  placeholder?: string;
  select?: boolean;
}) {
  return (
    <div className="border rounded px-2 py-1 text-[11px] flex items-center justify-between dark:bg-gray-900">
      <span className={value ? "" : "text-gray-400"}>
        {value || placeholder}
      </span>
      {select && <span className="text-gray-400">▾</span>}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded p-2.5 space-y-2.5">
      {title && <div className="font-bold text-xs">{title}</div>}
      {children}
    </div>
  );
}

export default function JobPreview({ tech }: { tech: any }) {
  // Permission flags default to "allowed" unless explicitly false (matches app).
  const can = (f: string) => tech?.[f] !== false;

  const seePhone = can("canSeeClientPhone");
  const seeCallerId = can("canSeeCallerId");
  const seeLead = can("canSeeLeadSource");
  const seeTech = can("canSeeTechnicianField");
  const editName = can("canEditCustomerName");
  const editAddr = can("canEditCustomerAddress");
  const editDesc = can("canEditDescription");
  const editStatus = can("canEditStatus");
  const changeType = can("canChangeJobType");
  const refreshExt = can("canRefreshExtension");
  const del = can("canDeleteJob");
  const dup = can("canDuplicateJob");
  const seeLogs = can("canSeeLogs");
  const seeRec = can("canSeeRecordings");
  const adjPct = can("canAdjustPercentages");
  const adjParts = can("canAdjustParts");
  const adjFees = can("canAdjustFees");
  const seeClosing = can("canSeeClosing");

  const btn = "px-2 py-1 rounded text-[10px] whitespace-nowrap";

  return (
    <div className="border rounded-lg bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* TABS */}
      <div className="flex gap-3 border-b px-3 pt-2 text-[11px]">
        <span className="font-semibold text-blue-600 border-b-2 border-blue-600 pb-1">
          Overview
        </span>
        <Restrict off={!seeLogs} inline>
          <span className="text-gray-500 pb-1">Log</span>
        </Restrict>
        <Restrict off={!seeRec} inline>
          <span className="text-gray-500 pb-1">Recordings</span>
        </Restrict>
      </div>

      <div className="p-3 space-y-3">
        {/* HEADER */}
        <div>
          <div className="font-bold text-sm">Job #L49UQY</div>
          <div className="text-green-600 text-[10px]">
            Created: 07/30/2026, 07:12 PM
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-wrap gap-1.5 items-start">
          <span className={`${btn} bg-gray-200 dark:bg-gray-700`}>Back</span>
          <Restrict off={!dup} inline>
            <span className={`${btn} bg-blue-600 text-white`}>
              Duplicate → New Job
            </span>
          </Restrict>
          <Restrict off={!del} inline>
            <span className={`${btn} bg-red-600 text-white`}>Delete</span>
          </Restrict>
        </div>

        {/* CUSTOMER INFO */}
        <Card title="Customer Information">
          <div>
            <Label>Name</Label>
            <Restrict off={!editName}>
              <RO value="LAK" />
            </Restrict>
          </div>

          {/* PHONE */}
          <div>
            <Label>Phone</Label>
            <div className="flex gap-1.5 items-center">
              <div className="flex-1">
                <Restrict off={!seePhone}>
                  <RO value="4073501222" />
                </Restrict>
              </div>
              <div className="w-12">
                <RO placeholder="Ext" />
              </div>
              <Restrict off={!seeCallerId} inline>
                <span className="text-gray-500 text-[10px] whitespace-nowrap">
                  Moriel - tech
                </span>
              </Restrict>
            </div>
          </div>

          {/* PHONE 2 */}
          <div>
            <Label>Phone 2</Label>
            <div className="flex gap-1.5 items-center">
              <div className="flex-1">
                <Restrict off={!seePhone}>
                  <RO value="4075551239" />
                </Restrict>
              </div>
              <div className="w-12">
                <RO placeholder="Ext" />
              </div>
            </div>
          </div>

          {/* MASKED CALLS */}
          <div className="text-[10px] text-gray-500 leading-relaxed">
            <div className="font-semibold text-gray-600 dark:text-gray-400">
              Masked Calls
            </div>
            <div>Phone 1 → 17733477668,3268</div>
            <div>Phone 2 → 17733477668,5951</div>
          </div>

          <Restrict off={!refreshExt} inline>
            <span className="text-blue-600 text-[10px] underline">
              Refresh Extensions
            </span>
          </Restrict>

          <div>
            <Label>Address</Label>
            <Restrict off={!editAddr}>
              <RO value="915 Mock Dr, Wilmette, IL 60091" />
            </Restrict>
          </div>

          <div>
            <Label>Timezone</Label>
            <RO value="Central (Chicago)" select />
          </div>

          <div>
            <Label>Job Type</Label>
            <Restrict off={!changeType}>
              <RO value="Lockout" select />
            </Restrict>
          </div>

          <div>
            <Label>Description / Notes</Label>
            <Restrict off={!editDesc}>
              <RO placeholder="Customer needs a re-key…" />
            </Restrict>
          </div>

          <Restrict off={!seeLead}>
            <div>
              <Label>Lead Source</Label>
              <RO value="Google LSA" select />
            </div>
          </Restrict>

          <Restrict off={!seeTech}>
            <div>
              <Label>Technician</Label>
              <RO value="Andre K. (+1 773 800 1567)" select />
              <div className="text-blue-600 text-[10px] underline mt-1">
                Preview SMS
              </div>
            </div>
          </Restrict>

          <div>
            <Label>Status</Label>
            <Restrict off={!editStatus}>
              <RO value="Closed" select />
            </Restrict>
          </div>

          <div>
            <Label>Appointment</Label>
            <div className="flex gap-1.5">
              <div className="flex-1">
                <RO placeholder="mm/dd/yyyy" />
              </div>
              <div className="flex-1">
                <RO placeholder="Select time" select />
              </div>
            </div>
            <div className="text-blue-600 text-[10px] underline mt-1">
              + Add Reminder
            </div>
          </div>

          <div className="flex gap-1.5">
            <span className={`${btn} bg-blue-600 text-white`}>
              Save &amp; Stay
            </span>
            <span className={`${btn} bg-gray-200 dark:bg-gray-700`}>
              Save &amp; Exit
            </span>
          </div>
        </Card>

        {/* JOB CLOSING */}
        <Restrict off={!seeClosing}>
          <Card title="Job Closing – Payment & Split">
          <div className="text-[10px] text-gray-500">Status: Closed</div>

          <div>
            <Label>Closed At</Label>
            <RO value="08/01/2026, 12:45 AM" />
            <div className="text-[10px] text-gray-400 mt-0.5">
              Change if the job was actually closed on a different date/time.
            </div>
          </div>

          {/* PAYMENT BLOCKS */}
          <div className="border rounded p-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[11px]">
                Payment Blocks (Multi-Payment)
              </span>
              <span className="text-blue-600 text-[10px] underline">
                + Add Payment
              </span>
            </div>
            <div className="border rounded p-1.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold">Payment #1</span>
                <span className="text-gray-400 text-[10px]">✕</span>
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1">
                  <Label>Method</Label>
                  <RO value="Cash" select />
                </div>
                <div className="flex-1">
                  <Label>Amount ($)</Label>
                  <RO placeholder="0.00" />
                </div>
              </div>
              <div className="text-[10px] text-gray-500">
                No choice – Cash → Technician · No Fee
              </div>
            </div>
          </div>

          {/* PERCENTAGES — covered red when tech can't adjust percentages */}
          <Restrict off={!adjPct}>
            <div className="border rounded p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[11px]">Percentages</span>
                <span className="flex gap-0.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-blue-600 text-white">
                    %
                  </span>
                  <span className="px-1.5 py-0.5 rounded border">$</span>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <Label>Tech %</Label>
                  <RO value="60" />
                </div>
                <div>
                  <Label>Lead %</Label>
                  <RO value="50" />
                </div>
                <div>
                  <Label>Company %</Label>
                  <RO value="0" />
                </div>
              </div>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <span className="inline-block w-3 h-3 border rounded-sm" />
                Disable auto-adjust
              </label>
            </div>
          </Restrict>

          {/* PARTS & FEES */}
          <div className="border rounded p-2 space-y-1.5">
            <div className="font-semibold text-[11px]">Parts &amp; Fees</div>
            <Restrict off={!adjParts}>
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <Label>Tech Parts</Label>
                  <RO value="0" />
                </div>
                <div>
                  <Label>Lead Parts</Label>
                  <RO value="0" />
                </div>
                <div>
                  <Label>Company Parts</Label>
                  <RO value="0" />
                </div>
              </div>
            </Restrict>
            {/* Add Fee — covered red when tech can't adjust fees */}
            <Restrict off={!adjFees}>
              <div>
                <Label>Add Fee ($)</Label>
                <RO value="0" />
              </div>
            </Restrict>
            <Restrict off={!adjFees}>
              <div className="space-y-1 text-[10px] text-gray-500">
                <label className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border rounded-sm" />
                  Tech pays additional fee
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border rounded-sm" />
                  Exclude tech from lead/company parts
                </label>
                <label className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border rounded-sm" />
                  Include parts in profit
                </label>
              </div>
            </Restrict>
          </div>

          <div>
            <Label>Invoice #</Label>
            <RO placeholder="Example: 2025-00123" />
          </div>

          <div className="text-[10px] text-gray-500">
            Totals &amp; Balances — enter values → press Close Job.
          </div>

          <div className="flex gap-1.5">
            <span className={`${btn} bg-green-600 text-white`}>
              Close Job &amp; Stay
            </span>
            <span className={`${btn} bg-gray-200 dark:bg-gray-700`}>
              Close Job &amp; Exit
            </span>
          </div>
          </Card>
        </Restrict>
      </div>

      {/* LEGEND */}
      <div className="px-3 pb-3 text-[10px] text-gray-400">
        <span className="inline-block w-3 h-3 align-middle bg-red-300/70 rounded mr-1" />
        Light-red overlay = restricted / hidden from this technician when that
        permission is off.
      </div>
    </div>
  );
}
