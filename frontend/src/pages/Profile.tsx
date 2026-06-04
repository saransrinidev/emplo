import { useEffect, useState, type FormEvent } from "react";
import { Pencil, ShieldCheck } from "lucide-react";
import { profileApi, type Address, type Profile as ProfileType, type EditableSections } from "../api/profile";
import { ApiError } from "../api/client";
import AsyncState from "../components/AsyncState";
import PageHeader from "../components/PageHeader";

function Section({
  title,
  rows,
  editable,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  editable?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 16 }}>
        <h2>{title}</h2>
        {editable && (
          <button className="btn btn-outline btn-sm" onClick={onEdit}>
            <Pencil size={14} /> Edit
          </button>
        )}
      </div>
      <div className="detail-grid">
        {rows.map(([label, value]) => (
          <div key={label} className="detail-item">
            <div className="detail-label">{label}</div>
            <div className="detail-value">{value || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatAddress(a: Address | undefined): string {
  if (!a) return "—";
  return [a.address_line, a.city, a.state, a.postal_code, a.country]
    .filter(Boolean)
    .join(", ");
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [perms, setPerms] = useState<EditableSections>({ phone: false, address: false, certifications: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState(false);
  const [editAddress, setEditAddress] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([profileApi.get(), profileApi.editableSections()])
      .then(([p, e]) => {
        setProfile(p);
        setPerms(e);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const hasAnyPermission = perms.phone || perms.address || perms.certifications;

  return (
    <div>
      <PageHeader title="Profile" subtitle="Your personal and employment details." />
      <AsyncState loading={loading} error={error}>
        {profile && (
          <div className="stack">
            {/* Temporary access banner */}
            {hasAnyPermission && (
              <div className="access-banner">
                <ShieldCheck size={20} />
                <div>
                  <strong>Temporary edit access granted</strong>
                  <p>
                    You can currently edit:{" "}
                    {[
                      perms.phone && "Phone",
                      perms.address && "Address",
                      perms.certifications && "Certifications",
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    . This access will expire automatically.
                  </p>
                </div>
              </div>
            )}

            <Section
              title="Personal Information"
              editable={perms.phone}
              onEdit={() => setEditPhone(true)}
              rows={[
                ["Employee ID", profile.employee_code],
                ["Full Name", profile.full_name],
                ["Email", profile.email],
                ["Mobile", profile.mobile_number ?? ""],
                ["Date of Birth", profile.date_of_birth ?? ""],
                ["Gender", profile.gender ?? ""],
                ["Marital Status", profile.marital_status ?? ""],
              ]}
            />
            <Section
              title="Employment Information"
              rows={[
                ["Date of Joining", profile.date_of_joining ?? ""],
                ["Department", profile.department ?? ""],
                ["Designation", profile.designation ?? ""],
                ["Manager", profile.manager_name ?? ""],
                ["Employment Status", profile.employment_status ?? ""],
                ["Work Location", profile.work_location ?? ""],
              ]}
            />
            <Section
              title="Address & Emergency Contact"
              editable={perms.address}
              onEdit={() => setEditAddress(true)}
              rows={[
                ["Current Address", formatAddress(profile.addresses.find((a) => a.address_type === "current"))],
                ["Permanent Address", formatAddress(profile.addresses.find((a) => a.address_type === "permanent"))],
                ["Emergency Contact", profile.emergency_contacts[0]?.contact_name ?? ""],
                ["Relationship", profile.emergency_contacts[0]?.relationship_to ?? ""],
                ["Contact Number", profile.emergency_contacts[0]?.contact_number ?? ""],
              ]}
            />

            {editPhone && (
              <EditPhoneModal
                current={profile.mobile_number ?? ""}
                onClose={() => setEditPhone(false)}
                onSaved={(updated) => {
                  setProfile(updated);
                  setEditPhone(false);
                }}
              />
            )}

            {editAddress && (
              <EditAddressModal
                profile={profile}
                onClose={() => setEditAddress(false)}
                onSaved={(updated) => {
                  setProfile(updated);
                  setEditAddress(false);
                }}
              />
            )}
          </div>
        )}
      </AsyncState>
    </div>
  );
}

// ------- Edit Phone Modal -------

function EditPhoneModal({
  current,
  onClose,
  onSaved,
}: {
  current: string;
  onClose: () => void;
  onSaved: (p: ProfileType) => void;
}) {
  const [phone, setPhone] = useState(current);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const updated = await profileApi.updatePhone(phone);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update phone.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Phone Number</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="field">
            <label>Mobile Number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 555 0100" />
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Edit Address Modal -------

function EditAddressModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: ProfileType;
  onClose: () => void;
  onSaved: (p: ProfileType) => void;
}) {
  const [addressType, setAddressType] = useState<"current" | "permanent">("current");
  const existing = profile.addresses.find((a) => a.address_type === addressType);
  const [line, setLine] = useState(existing?.address_line ?? "");
  const [city, setCity] = useState(existing?.city ?? "");
  const [state, setState] = useState(existing?.state ?? "");
  const [postal, setPostal] = useState(existing?.postal_code ?? "");
  const [country, setCountry] = useState(existing?.country ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // When address type changes, prefill from existing
  const handleTypeChange = (t: "current" | "permanent") => {
    setAddressType(t);
    const ex = profile.addresses.find((a) => a.address_type === t);
    setLine(ex?.address_line ?? "");
    setCity(ex?.city ?? "");
    setState(ex?.state ?? "");
    setPostal(ex?.postal_code ?? "");
    setCountry(ex?.country ?? "");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const updated = await profileApi.updateAddress({
        address_type: addressType,
        address_line: line || undefined,
        city: city || undefined,
        state: state || undefined,
        postal_code: postal || undefined,
        country: country || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update address.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Address</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <div className="field">
            <label>Address Type</label>
            <select className="input" value={addressType} onChange={(e) => handleTypeChange(e.target.value as "current" | "permanent")}>
              <option value="current">Current</option>
              <option value="permanent">Permanent</option>
            </select>
          </div>
          <div className="field">
            <label>Address Line</label>
            <input className="input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="12 Maple Street" />
          </div>
          <div className="form-grid">
            <div className="field">
              <label>City</label>
              <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="field">
              <label>State</label>
              <input className="input" value={state} onChange={(e) => setState(e.target.value)} />
            </div>
            <div className="field">
              <label>Postal Code</label>
              <input className="input" value={postal} onChange={(e) => setPostal(e.target.value)} />
            </div>
            <div className="field">
              <label>Country</label>
              <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Saving…" : "Save Address"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
