import { useEffect, useState } from "react";
import { IndianRupee, ChevronDown, ChevronRight, X, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { salaryStructureApi, type SalaryStructure } from "../api/salaryStructure";

interface Props {
  employeeId: string;
  employeeName?: string;
  onClose: () => void;
}

const EARNING_LABELS: Record<string, string> = {
  basic_pay: "Basic Pay",
  hra: "House Rent Allowance (HRA)",
  dearness_allowance: "Dearness Allowance (DA)",
  special_allowance: "Special Allowance",
  conveyance_allowance: "Conveyance Allowance",
  medical_allowance: "Medical Allowance",
  internet_allowance: "Internet Allowance",
  telephone_allowance: "Telephone Allowance",
  food_allowance: "Food Allowance",
  shift_allowance: "Shift Allowance",
  performance_bonus: "Performance Bonus",
  incentives: "Incentives",
  overtime: "Overtime",
  other_allowances: "Other Allowances",
};

const DEDUCTION_LABELS: Record<string, string> = {
  employee_pf: "Employee Provident Fund",
  employee_esi: "Employee State Insurance (ESI)",
  professional_tax: "Professional Tax",
  income_tax_tds: "Income Tax (TDS)",
  labour_welfare_fund: "Labour Welfare Fund",
  nps_employee: "National Pension Scheme",
  insurance_deduction: "Insurance Deduction",
  loan_recovery: "Loan Recovery",
  advance_recovery: "Advance Recovery",
  other_deductions: "Other Deductions",
};

const EMPLOYER_LABELS: Record<string, string> = {
  employer_pf: "Employer Provident Fund",
  employer_esi: "Employer ESI",
  gratuity: "Gratuity",
  employer_insurance: "Employer Insurance",
  employer_nps: "Employer NPS",
};

function formatCurrency(val: number): string {
  if (!val) return "₹0";
  return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function SalaryStructureModal({ employeeId, employeeName, onClose }: Props) {
  const [structure, setStructure] = useState<SalaryStructure | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["earnings", "deductions", "employer", "summary"]));

  useEffect(() => {
    const fetcher = employeeId === "my"
      ? salaryStructureApi.getMy()
      : salaryStructureApi.get(employeeId);
    fetcher
      .then((data) => setStructure(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [employeeId]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const renderComponents = (components: Record<string, number>, labels: Record<string, string>) => {
    const entries = Object.entries(components).filter(([_, v]) => v > 0);
    if (entries.length === 0) return <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "8px 0" }}>No components configured</p>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(([key, val]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderRadius: 6, background: "hsl(var(--border) / 0.2)" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{labels[key] || key.replace(/_/g, " ")}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{formatCurrency(val)}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>Salary Structure</h2>
            {employeeName && <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "2px 0 0" }}>{employeeName}</p>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading && <p className="muted" style={{ textAlign: "center", padding: 40 }}>Loading salary structure...</p>}

          {!loading && !structure && (
            <div style={{ textAlign: "center", padding: 40 }}>
              <Wallet size={40} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: 12 }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text)" }}>No salary structure configured</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>HR needs to set up the salary breakdown for this employee.</p>
            </div>
          )}

          {!loading && structure && (
            <>
              {/* Summary Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(142 60% 95% / 0.5)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(142 60% 35%)", marginBottom: 4 }}>GROSS SALARY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.gross_salary)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/ month</div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(0 60% 95% / 0.5)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(0 60% 45%)", marginBottom: 4 }}>DEDUCTIONS</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.total_deductions)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>/ month</div>
                </div>
                <div style={{ padding: "12px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))", background: "hsl(220 70% 95% / 0.5)" }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "hsl(220 70% 45%)", marginBottom: 4 }}>NET SALARY</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.net_salary)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>take home</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>MONTHLY CTC</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.monthly_ctc)}</div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>ANNUAL CTC</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.annual_ctc)}</div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid hsl(var(--border))" }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-muted)" }}>EMPLOYER COST</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{formatCurrency(structure.employer_cost)}</div>
                </div>
              </div>

              {/* Collapsible Sections */}
              {/* Earnings */}
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => toggleSection("earnings")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "none", background: "hsl(142 60% 95% / 0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingUp size={14} style={{ color: "hsl(142 60% 35%)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Earnings</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(142 60% 35%)" }}>{formatCurrency(structure.gross_salary)}</span>
                    {expandedSections.has("earnings") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>
                {expandedSections.has("earnings") && <div style={{ padding: "8px 12px" }}>{renderComponents(structure.earnings, EARNING_LABELS)}</div>}
              </div>

              {/* Deductions */}
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => toggleSection("deductions")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "none", background: "hsl(0 60% 95% / 0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <TrendingDown size={14} style={{ color: "hsl(0 60% 45%)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Deductions</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(0 60% 45%)" }}>-{formatCurrency(structure.total_deductions)}</span>
                    {expandedSections.has("deductions") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>
                {expandedSections.has("deductions") && <div style={{ padding: "8px 12px" }}>{renderComponents(structure.deductions, DEDUCTION_LABELS)}</div>}
              </div>

              {/* Employer Contributions */}
              <div style={{ border: "1px solid hsl(var(--border))", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => toggleSection("employer")} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "none", background: "hsl(220 70% 95% / 0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IndianRupee size={14} style={{ color: "hsl(220 70% 45%)" }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>Employer Contributions</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "hsl(220 70% 45%)" }}>{formatCurrency(structure.employer_cost)}</span>
                    {expandedSections.has("employer") ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                </button>
                {expandedSections.has("employer") && <div style={{ padding: "8px 12px" }}>{renderComponents(structure.employer_contributions, EMPLOYER_LABELS)}</div>}
              </div>

              <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "var(--bg-secondary, hsl(var(--border) / 0.2))", fontSize: 12, color: "var(--text-muted)" }}>
                Effective from: {structure.effective_date}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
