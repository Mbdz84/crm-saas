export interface IngestJobPayload {
  customerName?: string;
  customerPhone?: string;
  customerPhone2?: string;
  customerAddress?: string;

  description?: string; // notes from AI / SMS
  jobType?: string; // optional name

  scheduledAt?: string; // ISO
  timezone?: string;

  externalId?: string; // optional (for dedupe later)
}