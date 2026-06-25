import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { salaryStructureApi, type SalaryTotals } from "../api/salaryStructure";
import { ApiError } from "../api/client";

interface Props {
  employeeId: string;
  onClose: () => void;
}

const EARNING_FIELDS = [
  { key: "basic_pay", label: "Basic Pay" },
  { key: "hra", label: "HRA" },
  { key: "dearness_allowance", label: "Dearness Allowance" },
  { key: "special_allowance", label: "Special Allowance" },
  { key: "conveyance_allowance", label: "Conveyance" },
  { key: "medical_allowance", label: "Medical" },
  { key: "internet_allowance", label: "Internet" },
  { key: "telephone_allowance", label: "Telephone" },
  { key: "food_allowance", label: "Food" },
  { key: "shift_allowance", label: "Shift" },
  { key: "performance_bonus", label: "Performance Bonus" },
  { key: "incentives", label: "Incentives" },
  { key: "overtime", label: "Overtime" },
  { key: "other_allowances", label: "Other Allowances" },
];

const DEDUCTION_FIELDS = [
  { key: "employee_pf", label: "Employee PF" },
  { key: "employee_esi", label: "Employee ESI" },
  { key: "professional_tax", label: "Professional Tax" },
  { key: "income_tax_tds", label: "Income Tax (TDS)" },
  { key: "labour_welfare_fund", label: "Labour Welfare Fund" },
  { key: "nps_employee", label: "NPS (Employee)" },
  { key: "insurance_deduction", label: "Insurance" },
  { key: "loan_recovery", label: "Loan Recovery" },
  { key: "advance_recovery", label: "Advance Recovery" },
  { key: "other_deductions", label: "Other Deductions" },
];

const EMPLOYER_FIELDS = [
  { key: "employer_pf", label: "Employer PF" },
  { key: "employer_esi", label: "Employer ESI" },
  { key: "gratuity", label: "Gratuity" },
  { key: "employer_insurance", label: "Employer Insurance" },
  { key: "employer_nps", label: "Employer NPS" },
];

function fmt(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function EditSalaryStructureModal({ employeeId, onClose }: Props) {
  const [earnings, setEarnings] = useState<Record<string, number>>({});
  const [deductions, setDeductions] = useState<Record<string, number>>({});
  const [employer, setEmployer] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<SalaryTotals | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load existing structure or template
  useEffect(() => {
    (async () => {
      try {
        const existing = await salaryStructureApi.get(employeeId);
        if (existing) {
          setEarnings(existing.earnings);
          setDeductions(existing.deductions);
          setEmployer(existing.employer_contributions);
        } else {
          const template = await salaryStructureApi.getTemplate();
          setEarnings(template.earnings);
          setDeductions(template.deductions);
          setEmployer(template.employer_contributions);
        }
      } catch { /* use empty */ }
      finally { setLoading(false); }
    })();
  }, [employeeId]);

  // Auto-calculate totals when any value changes
  useEffect(() => {
    const gross = Object.values(earnings).reduce((s, v) => s + (v || 0), 0);
    const ded = Object.values(deductions).reduce((s, v) => s + (v || 0), 0);
    const emp = Object.values(employer).reduce((s, v) => s + (v || 0), 0);
    setTotals({
      gross_salary: gross,
      total_deductions: ded,
      net_salary: Math.max(gross - ded, 0),
      employer_cost: emp,
      monthly_ctc: gross + emp,
      annual_ctc: (gross + emp) * 12,
    });
  }, [earnings, deductions, employer]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      await salaryStructureApi.save(employeeId, { earnings, deductions, employer_contributions: employer });
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally { setSaving(false); }
  };

  const updateField = (setter: React.Dispatch<React.SetStateAction<Record<string, number>>>, key: string, val: string) => {
    setter((prev) => ({ ...prev, [key]: Number(val) || 0 }));
  };

  const renderSection = (
    title: string, color: string, fields: { key: string; label: string }[],
    values: Record<string, number>, setter: React.Dispatch<React.SetStateAction<Record<string, number>>>, total: number
  ) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color }}>{title}</h4>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{fmt(total)}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 12px" }}>
        {fields.map(({ key, label }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 90, flex: "0 0 90px" }}>{label}</label>
            <input
              className="input"
              type="number"
              min="0"
              style={{ height: 28, fontSize: 12, padding: "2px 8px" }}
              value={values[key] || ""}
              onChange={(e) => updateField(setter, key, e.target.value)}
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640, maxHeight: "90vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ fontSize: 16, margin: 0 }}>Edit Salary Structure</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && <p className="muted" style={{ padding: 20, textAlign: "center" }}>Loading...</p>}

          {!loading && (
            <>
              {/* Live Totals */}
              {totals && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 20, padding: 12, borderRadius: 10, background: "hsl(var(--border) / 0.2)" }}>
                  <div><div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>GROSS</div><div style={{ fontSize: 15, fontWeight: 700, color: "hsl(142 60% 35%)" }}>{fmt(totals.gross_salary)}</div></div>
                  <div><div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>NET SALARY</div><div style={{ fontSize: 15, fontWeight: 700, color: "hsl(220 70% 45%)" }}>{fmt(totals.net_salary)}</div></div>
                  <div><div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>ANNUAL CTC</div><div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{fmt(totals.annual_ctc)}</div></div>
                </div>
              )}

              {renderSection("Earnings", "hsl(142 60% 35%)", EARNING_FIELDS, earnings, setEarnings, totals?.gross_salary || 0)}
              {renderSection("Deductions", "hsl(0 60% 45%)", DEDUCTION_FIELDS, deductions, setDeductions, totals?.total_deductions || 0)}
              {renderSection("Employer Contributions", "hsl(220 70% 45%)", EMPLOYER_FIELDS, employer, setEmployer, totals?.employer_cost || 0)}

              {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
              {success && <p style={{ color: "hsl(142 60% 35%)", fontWeight: 600, marginBottom: 12 }}>✓ Salary structure saved successfully!</p>}
            </>
          )}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid hsl(var(--border))", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-sm" onClick={handleSave} disabled={saving || success}>
            <Save size={14} /> {saving ? "Saving..." : "Save Structure"}
          </button>
        </div>
      </div>
    </div>
  );
}
