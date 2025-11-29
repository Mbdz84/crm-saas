/* ---- JOB STATUS ---- */
export interface JobStatus {
  id: string;
  name: string;
  order: number;
  active: boolean;
}

/* ---- JOB MODEL ---- */
export interface Job {
  id: string;
  shortId?: string;
  title: string;
  description?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;

  jobType?: { id: string; name: string } | null;
  technician?: { id: string; name: string; phone?: string | null } | null;

  jobTypeId?: string | null;
  technicianId?: string | null;

  scheduledAt?: string | null;

  status?: string | null;
  statusId?: string | null;
  jobStatus?: { id: string; name: string } | null;

  isClosingLocked?: boolean;
  closedAt?: string | null;
  closedByUser?: { id: string; name: string; role: string } | null;

  createdAt: string;

  source?: { id: string; name: string } | null;
  sourceId?: string | null;

  logs?: {
    id: string;
    createdAt: string;
    type: string;
    text: string;
    user?: {
      id: string;
      name: string;
      role: string;
    } | null;
  }[];

  callSessions?: {
    id?: string;
    extension: string;
    customerPhone: string;
    createdAt: string;
  }[];

  recordings?: {
    id: string;
    callSid: string;
    from: string;
    to: string;
    url: string;
    createdAt: string;
  }[];
}

/* ---- JOB TYPE ---- */
export interface JobType {
  id: string;
  name: string;
}

/* ---- TECHNICIAN ---- */
export interface Tech {
  id: string;
  name: string;
  phone?: string | null;
}

/* ---- FORMULA ENGINE TYPES ---- */

export type PaymentMethod = "cash" | "credit" | "check" | "zelle";
export type Collector = "tech" | "company" | "lead";

export interface PaymentRow {
  id: number;
  payment: PaymentMethod;
  collectedBy: Collector;
  amount: string;
  ccFeePct: string;
}

export interface FormulaResult {
  totalAmount: number;
  cashTotal: number;
  creditTotal: number;
  checkTotal: number;
  zelleTotal: number;

  techParts: number;
  leadParts: number;
  companyParts: number;
  totalParts: number;

  totalCcFee: number;
  additionalFee: number;
  adjustedTotal: number;

  techPercent: number;
  leadPercent: number;
  companyPercent: number;

  techProfit: number;
  leadProfit: number;
  companyProfit: number;

  techBalance: number;
  leadBalance: number;
  companyBalance: number;

  sumCheck: number;
}