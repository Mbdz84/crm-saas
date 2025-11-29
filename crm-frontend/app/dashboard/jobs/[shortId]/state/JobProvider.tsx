"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

const JobContext = createContext<any>(null);

export function JobProvider({
  children,
  customJobId,
}: {
  children: React.ReactNode;
  customJobId?: string;
}) {
  const params = useParams() as { shortId?: string };
  const shortId = (customJobId || params.shortId || "").toUpperCase();

  const router = useRouter();
  const base = process.env.NEXT_PUBLIC_API_URL;

  /* MAIN JOB STATE */
  const [job, setJob] = useState<any>(null);
  const [editableJob, setEditableJob] = useState<any>(null);
  const [dirty, setDirty] = useState(false);

  const [tab, setTab] =
    useState<"overview" | "log" | "recordings">("overview");

  /* LOOKUP DATA */
  const [jobTypes, setJobTypes] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [techs, setTechs] = useState<any[]>([]);

  /* PAYMENTS */
  const [payments, setPayments] = useState<any[]>([
    {
      id: 1,
      payment: "cash",
      collectedBy: "tech",
      amount: "",
      ccFeePct: "0",
    },
  ]);

  /* SPLIT PERCENTS */
  const [techPercent, setTechPercent] = useState("30");
  const [leadPercent, setLeadPercent] = useState("50");
  const [companyPercent, setCompanyPercent] = useState("20");

  /* PARTS & FEES */
  const [techParts, setTechParts] = useState("0");
  const [leadParts, setLeadParts] = useState("0");
  const [companyParts, setCompanyParts] = useState("0");
  const [leadAdditionalFee, setLeadAdditionalFee] = useState("0");
  const [techPaysAdditionalFee, setTechPaysAdditionalFee] =
    useState(false);
  const [excludeTechFromParts, setExcludeTechFromParts] =
    useState(false);

  /* FLAGS / TOGGLES */
  const [includePartsInProfit, setIncludePartsInProfit] =
    useState(true);
  const [disableAutoAdjust, setDisableAutoAdjust] = useState(false);
  const [leadOwnedByCompany, setLeadOwnedByCompany] =
    useState(false);

  /* INVOICE + RESULT */
  const [invoiceNumberState, setInvoiceState] = useState("");
  const [result, setResult] = useState<any>(null);

  /* ----------------- API LOADERS ----------------- */

  async function loadJob() {
    if (!base || !shortId) return;

    try {
      const res = await fetch(`${base}/jobs/${shortId}`, {
        credentials: "include",
      });

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to load job");
        return;
      }

      setJob(data);
      setEditableJob(data);
      setDirty(false);

      // Hydrate closing block into front-end state
      if (data.closing) {
        const c = data.closing;

        if (Array.isArray(c.payments) && c.payments.length > 0) {
          setPayments(c.payments);
        }

        setTechParts(String(c.techParts ?? 0));
        setLeadParts(String(c.leadParts ?? 0));
        setCompanyParts(String(c.companyParts ?? 0));

        setTechPercent(String(c.techPercent ?? 0));
        setLeadPercent(String(c.leadPercent ?? 0));
        setCompanyPercent(String(c.companyPercent ?? 0));

        setLeadAdditionalFee(String(c.leadAdditionalFee ?? 0));
        setTechPaysAdditionalFee(Boolean(c.techPaysAdditionalFee));
        setExcludeTechFromParts(Boolean(c.excludeTechFromParts));
        setLeadOwnedByCompany(Boolean(c.leadOwnedByCompany));
        setInvoiceState(c.invoiceNumber ?? "");

        setResult({
          totalAmount: Number(c.totalAmount),
          techParts: Number(c.techParts),
          leadParts: Number(c.leadParts),
          companyParts: Number(c.companyParts),
          totalParts: Number(c.totalParts),
          totalCcFee: Number(c.totalCcFee),
          adjustedTotal: Number(c.adjustedTotal),

          techPercent: Number(c.techPercent),
          leadPercent: Number(c.leadPercent),
          companyPercent: Number(c.companyPercent),

          techProfit: Number(c.techProfit),
          leadProfit: Number(c.leadProfit),
          companyProfit: Number(c.companyProfitDisplay),
          companyProfitBase: Number(c.companyProfitBase ?? 0),

          techBalance: Number(c.techBalance),
          leadBalance: Number(c.leadBalance),
          companyBalance: Number(c.companyBalance),
          sumCheck: Number(c.sumCheck),
        });
      }
    } catch {
      toast.error("Failed to load job");
    }
  }

  async function loadStatuses() {
    if (!base) return;
    try {
      const res = await fetch(`${base}/job-status`, {
        credentials: "include",
      });
      if (res.ok) setStatuses(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function loadJobTypes() {
    if (!base) return;
    try {
      const res = await fetch(`${base}/job-types`, {
        credentials: "include",
      });
      if (res.ok) setJobTypes(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function loadLeadSources() {
    if (!base) return;
    try {
      const res = await fetch(`${base}/lead-sources`, {
        credentials: "include",
      });
      if (res.ok) setLeadSources(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function loadTechs() {
    if (!base) return;
    try {
      const res = await fetch(`${base}/technicians`, {
        credentials: "include",
      });
      if (res.ok) setTechs(await res.json());
    } catch {
      /* ignore */
    }
  }

  async function loadRecordings() {
  if (!base || !shortId) return;
  try {
    const res = await fetch(`${base}/jobs/${shortId}/recordings`, {
      credentials: "include",
    });

    if (!res.ok) return;

    const data = await res.json();

    setJob((prev: any) => ({
      ...(prev || {}),
      recordings: data,
    }));
  } catch {
    /* ignore */
  }
}

  /* ----------------- INITIAL LOAD ----------------- */
  useEffect(() => {
    if (!base || !shortId) return;
    loadJob();
    loadStatuses();
    loadJobTypes();
    loadLeadSources();
    loadTechs();
    loadRecordings();
  }, [base, shortId]);

  /* OPTIONAL: AUTO-REFRESH RECORDINGS (same behavior as before) */
  useEffect(() => {
    if (!base || !shortId) return;
    const interval = setInterval(
      () => loadRecordings(),
      5_000_000 // ~83 minutes, same as old code
    );
    return () => clearInterval(interval);
  }, [base, shortId]);

  return (
    <JobContext.Provider
      value={{
        /* basic */
        job,
        loading: job === null,
        editableJob,
        setEditableJob,
        dirty,
        setDirty,

        tab,
        setTab,

        /* lookups */
        jobTypes,
        statuses,
        leadSources,
        techs,

        /* payments / split */
        payments,
        setPayments,

        techPercent,
        setTechPercent,
        leadPercent,
        setLeadPercent,
        companyPercent,
        setCompanyPercent,

        techParts,
        setTechParts,
        leadParts,
        setLeadParts,
        companyParts,
        setCompanyParts,

        leadAdditionalFee,
        setLeadAdditionalFee,
        techPaysAdditionalFee,
        setTechPaysAdditionalFee,
        excludeTechFromParts,
        setExcludeTechFromParts,

        includePartsInProfit,
        setIncludePartsInProfit,
        disableAutoAdjust,
        setDisableAutoAdjust,
        leadOwnedByCompany,
        setLeadOwnedByCompany,

        invoiceNumberState,
        setInvoiceState,

        result,
        setResult,

        shortId,
        base,
        reload: loadJob,
        loadJob,
      }}
    >
      {children}
    </JobContext.Provider>
  );
}

export function useJob() {
  return useContext(JobContext);
}