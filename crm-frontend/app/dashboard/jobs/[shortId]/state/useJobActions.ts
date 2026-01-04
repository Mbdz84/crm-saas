"use client";

import { useJob } from "./JobProvider";
import { toast } from "sonner";
import { useRef } from "react";

export function useJobActions() {
  const jobCtx = useJob();

  const {
    editableJob,
    setEditableJob,
    setDirty,
    job,

    payments,
    setPayments,

    techPercent,
    leadPercent,
    companyPercent,
    techParts,
    leadParts,
    companyParts,
    leadAdditionalFee,
    techPaysAdditionalFee,
    excludeTechFromParts,
    includePartsInProfit,
    disableAutoAdjust,
    leadOwnedByCompany,

    invoiceNumberState,
    setResult,

    base,
    reload,
  } = jobCtx;

  const shortId: string | undefined = job?.shortId;

  const prevTechIdRef = useRef<string | null>(null);

// initialize once job is loaded
if (job && prevTechIdRef.current === null) {
  prevTechIdRef.current = job.technicianId || null;
}

  /* ---------------- BASIC EDIT ---------------- */
  function setField(field: string, value: any) {
    setEditableJob((prev: any) => ({
      ...prev,
      [field]: value,
    }));
    setDirty(true);
  }

  /* ---------------- SAVE CHANGES ---------------- */
  async function saveChanges(extra: any = {}) {
  if (!editableJob) return;
  if (!base) {
    toast.error("API base URL is not configured");
    return;
  }

  const prevTechId = prevTechIdRef.current;
  const newTechId = editableJob.technicianId || null;

  try {
    // 1️⃣ Save job normally
    const res = await fetch(`${base}/jobs/${editableJob.shortId}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...editableJob,
        closedAt: editableJob.closedAt
          ? new Date(editableJob.closedAt)
          : null,
        ...extra,
      }),
    });

    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Save failed");

    // 2️⃣ If technician changed → regenerate extensions
    if (prevTechId && prevTechId !== newTechId) {
      await fetch(
        `${base}/jobs/${editableJob.shortId}/refresh-extension`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    }

    // 3️⃣ Update ref AFTER save
    prevTechIdRef.current = newTechId;

    toast.success("Saved");
    reload(); // 🔥 reload AFTER extensions exist
  } catch {
    toast.error("Save failed");
  }
}


  /* ---------------- PAYMENT FUNCTIONS ---------------- */

  function addPaymentRow() {
  const sourceDefaults = (() => {
    const src = job?.source;
    return {
      cc: src?.defaultCcFeePercent != null ? String(src.defaultCcFeePercent) : "0",
      check: src?.defaultCheckFeePercent != null ? String(src.defaultCheckFeePercent) : "0",
    };
  })();

  setPayments((prev: any[]) => [
    ...prev,
    {
      id: prev.length ? prev[prev.length - 1].id + 1 : 1,
      payment: "cash",
      collectedBy: "tech",
      amount: "",
      ccFeePct: sourceDefaults.cc,
      checkFeePct: sourceDefaults.check,
    },
  ]);
}

  function removePaymentRow(id: number) {
    setPayments((prev: any[]) => prev.filter((p) => p.id !== id));
  }

  function updatePayment(
    id: number,
    field: keyof any,
    value: string
  ) {
    setPayments((prev: any[]) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              [field]: value,
              ...(field === "payment"
                ? {
      collectedBy:
        value === "cash" ? "tech" : p.collectedBy,

      // Credit → keep cc fee, otherwise reset
      ccFeePct: value === "credit" ? p.ccFeePct : "0",

      // Check → keep check fee, otherwise reset
      checkFeePct: value === "check" ? p.checkFeePct : "0",
    }
  : {}),
            }
          : p
      )
    );
  }

  /* ---------------- PERCENT LOGIC ---------------- */

  function handlePercentChange(
    field: "tech" | "lead" | "company",
    value: string
  ) {
    const num = Number(value);
    if (isNaN(num)) return;

    if (disableAutoAdjust) {
      if (field === "tech") jobCtx.setTechPercent(value);
      if (field === "lead") jobCtx.setLeadPercent(value);
      if (field === "company") jobCtx.setCompanyPercent(value);
      return;
    }

    if (field === "tech") {
      jobCtx.setTechPercent(value);
      return;
    }

    if (field === "lead") {
      jobCtx.setLeadPercent(value);
      const newCompany = 100 - (Number(techPercent) || 0) - num;
      jobCtx.setCompanyPercent(String(newCompany));
      return;
    }

    if (field === "company") {
      jobCtx.setCompanyPercent(value);
      const newLead = 100 - (Number(techPercent) || 0) - num;
      jobCtx.setLeadPercent(String(newLead));
    }
  }

  function normalizePercent(field: "tech" | "lead" | "company") {
    let val =
      field === "tech"
        ? techPercent
        : field === "lead"
        ? leadPercent
        : companyPercent;

    if (val === "" || val === null) val = "0";
    const num = Number(val);

    const formatted =
      Math.abs(num % 1) < 0.00001 ? String(num) : num.toFixed(2);

    if (field === "tech") jobCtx.setTechPercent(formatted);
    if (field === "lead") {
      jobCtx.setLeadPercent(formatted);
      const newCompany = 100 - (Number(techPercent) || 0) - num;
      jobCtx.setCompanyPercent(
        Math.abs(newCompany % 1) < 0.00001
          ? String(newCompany)
          : newCompany.toFixed(2)
      );
    }
    if (field === "company") {
      jobCtx.setCompanyPercent(formatted);
      const newLead = 100 - (Number(techPercent) || 0) - num;
      jobCtx.setLeadPercent(
        Math.abs(newLead % 1) < 0.00001
          ? String(newLead)
          : newLead.toFixed(2)
      );
    }
  }

  /* ---------------- CLOSING CALCULATION ---------------- */

  function calculateSplit() {
    try {
      let totalAmount = 0;
      let totalCcFee = 0;

      let amountHeldByTech = 0;
      let amountHeldByCompany = 0;
      let amountHeldByLead = 0;

      let cashTotal = 0;
      let creditTotal = 0;
      let checkTotal = 0;
      let zelleTotal = 0;

      payments.forEach((p: any) => {
        const amt = Number(p.amount) || 0;
        totalAmount += amt;

        if (p.payment === "cash") {
          cashTotal += amt;
          amountHeldByTech += amt;
        } else {
          if (p.payment === "credit") creditTotal += amt;
          if (p.payment === "check") checkTotal += amt;
          if (p.payment === "zelle") zelleTotal += amt;

          if (p.collectedBy === "tech") amountHeldByTech += amt;
          if (p.collectedBy === "company")
            amountHeldByCompany += amt;
          if (p.collectedBy === "lead") amountHeldByLead += amt;
        }

        if (p.payment === "credit") {
          const pct = Number(p.ccFeePct) || 0;
          totalCcFee += (amt * pct) / 100;
        }
        // CHECK FEE %
if (p.payment === "check") {
  const pct = Number(p.checkFeePct) || 0;
  totalCcFee += (amt * pct) / 100;   // we treat ALL fees under totalCcFee bucket
}
      });

      const techP = Number(techParts) || 0;
      const leadP = Number(leadParts) || 0;
      const compP = Number(companyParts) || 0;
      const totalParts = techP + leadP + compP;

      const tPct = (Number(techPercent) || 0) / 100;
      const lPct = (Number(leadPercent) || 0) / 100;
      const cPct = (Number(companyPercent) || 0) / 100;

      const adjustedTotal = totalAmount - totalParts - totalCcFee;

      // Base profit from split
      let techProfit = adjustedTotal * tPct;
      let leadProfit = adjustedTotal * lPct;
      let companyProfit = adjustedTotal * cPct;

      // Add CC fee to whoever collected credit payments
      payments.forEach((p: any) => {
        if (p.payment !== "credit") return;
        const amt = Number(p.amount) || 0;
        const pct = Number(p.ccFeePct) || 0;
        const fee = (amt * pct) / 100;

        if (p.collectedBy === "tech") techProfit += fee;
        else if (p.collectedBy === "lead") leadProfit += fee;
        else companyProfit += fee;
      });

// Add CHECK fee to whoever collected check payments
payments.forEach((p: any) => {
  if (p.payment !== "check") return;

  const amt = Number(p.amount) || 0;
  const pct = Number(p.checkFeePct) || 0;
  const fee = (amt * pct) / 100;

  if (p.collectedBy === "tech") techProfit += fee;
  else if (p.collectedBy === "lead") leadProfit += fee;
  else companyProfit += fee;
});

      // Additional fee (leadAdditionalFee)
      const addFee = Number(leadAdditionalFee) || 0;
      if (addFee !== 0) {
        leadProfit += addFee;
        if (techPaysAdditionalFee) techProfit -= addFee;
        else companyProfit -= addFee;
      }

      // 🚩 companyProfitBase = BEFORE parts-in-profit & leadOwnedByCompany
      const companyProfitBase = companyProfit;

      // Display profits (may include parts and lead transfer)
      let techProfitDisplay = techProfit;
      let leadProfitDisplay = leadProfit;
      let companyProfitDisplay = companyProfit;

      // Include parts in display profit if toggle is on
      if (includePartsInProfit) {
        techProfitDisplay += techP;
        leadProfitDisplay += leadP;
        companyProfitDisplay += compP;
      }

      // If company owns the lead, move lead profit into company
      if (leadOwnedByCompany) {
        companyProfitDisplay += leadProfitDisplay;
        leadProfitDisplay = 0;
      }

      // Balances are based on base profit (not display) and parts
      const techBalance = amountHeldByTech - techProfit - techP;
      const leadBalance = amountHeldByLead - leadProfit - leadP;
      const companyBalance =
        amountHeldByCompany - companyProfit - compP;

      const sumCheck =
        techProfit + leadProfit + companyProfit - adjustedTotal;

      const result = {
        totalAmount,
        cashTotal,
        creditTotal,
        checkTotal,
        zelleTotal,
        techParts: techP,
        leadParts: leadP,
        companyParts: compP,
        totalParts,
        totalCcFee,
        adjustedTotal,
        techPercent: Number(techPercent),
        leadPercent: Number(leadPercent),
        companyPercent: Number(companyPercent),
        techProfit: techProfitDisplay,
        leadProfit: leadProfitDisplay,
        companyProfit: companyProfitDisplay,
        companyProfitBase,
        techBalance,
        leadBalance,
        companyBalance,
        sumCheck,
      };

      setResult(result);
      return result;
    } catch (err) {
      console.error(err);
      toast.error("Error calculating");
      return null;
    }
  }

  /* ---------------- CLOSE JOB ---------------- */

  async function closeJob(r: any, extra: any = {}) {
  if (!job) return;
  if (!base) {
    toast.error("API base URL is not configured");
    return;
  }

  try {
    const payload = {
      invoiceNumber: invoiceNumberState || "",
      payments: payments,

      totalAmount: r.totalAmount,
      totalCcFee: r.totalCcFee,
      techParts: r.techParts,
      leadParts: r.leadParts,
      companyParts: r.companyParts,
      totalParts: r.totalParts,
      adjustedTotal: r.adjustedTotal,

      techPercent: r.techPercent,
      leadPercent: r.leadPercent,
      companyPercent: r.companyPercent,

      excludeTechFromParts,
      techPaysAdditionalFee,
      leadAdditionalFee,
      leadOwnedByCompany,
      techProfit: r.techProfit,
      leadProfit: r.leadProfit,

      companyProfitBase: r.companyProfitBase,
      companyProfitDisplay: r.companyProfit,

      techBalance: r.techBalance,
      leadBalance: r.leadBalance,
      companyBalance: r.companyBalance,
      sumCheck: r.sumCheck,

      statusId: editableJob?.statusId,
    };

    const res = await fetch(`${base}/jobs/${job.shortId}/close`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        ...extra,   // <-- statusNote works here
      }),
    });

    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Close failed");

    toast.success("Job closed");
    reload();
  } catch {
    toast.error("Error closing job");
  }
}

  return {
    setField,
    saveChanges,
    addPaymentRow,
    removePaymentRow,
    updatePayment,
    handlePercentChange,
    normalizePercent,
    calculateSplit,
    closeJob,

    // Expose setters so UI can bind directly
    setTechPercent: jobCtx.setTechPercent,
    setLeadPercent: jobCtx.setLeadPercent,
    setCompanyPercent: jobCtx.setCompanyPercent,
    setTechParts: jobCtx.setTechParts,
    setLeadParts: jobCtx.setLeadParts,
    setCompanyParts: jobCtx.setCompanyParts,
    setLeadAdditionalFee: jobCtx.setLeadAdditionalFee,
    setTechPaysAdditionalFee: jobCtx.setTechPaysAdditionalFee,
    setExcludeTechFromParts: jobCtx.setExcludeTechFromParts,
    setIncludePartsInProfit: jobCtx.setIncludePartsInProfit,
    setDisableAutoAdjust: jobCtx.setDisableAutoAdjust,
    setInvoiceState: jobCtx.setInvoiceState,
    setLeadOwnedByCompany: jobCtx.setLeadOwnedByCompany,
  };
}