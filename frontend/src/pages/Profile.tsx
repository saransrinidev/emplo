import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Pencil, ShieldCheck, Clock, Send, User, Briefcase, Calendar, MapPin, Download, MoreVertical } from "lucide-react";
import { profileApi, type Address, type Profile as ProfileType, type EditableSections } from "../api/profile";
import { editRequestsApi, type EditRequest } from "../api/editRequests";
import { ApiError } from "../api/client";
import AsyncState from "../components/AsyncState";

function Section({
  title,
  rows,
  editable,
  onEdit,
  canRequest,
  onRequestEdit,
  pendingRequest,
  icon,
  iconVariant = "indigo",
  id,
}: {
  title: string;
  rows: [string, string][];
  editable?: boolean;
  onEdit?: () => void;
  canRequest?: boolean;
  onRequestEdit?: () => void;
  pendingRequest?: EditRequest | null;
  icon?: React.ReactNode;
  iconVariant?: "indigo" | "blue" | "orange";
  id?: string;
}) {
  return (
    <div className="card" id={id}>
      <div className="row" style={{ marginBottom: 20 }}>
        <div className="section-title-container">
          {icon && <div className={`section-title-icon section-title-${iconVariant}`}>{icon}</div>}
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {editable && (
            <button className="btn btn-outline btn-sm" onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
          )}
          {!editable && canRequest && !pendingRequest && (
            <button className="btn btn-outline btn-sm" onClick={onRequestEdit}>
              <Send size={14} /> Request Edit
            </button>
          )}
          {pendingRequest && pendingRequest.status === "pending" && (
            <span className="badge badge-warning" style={{ fontSize: 12 }}>
              <Clock size={12} /> Request Pending
            </span>
          )}
          {pendingRequest && pendingRequest.status === "approved" && (
            <span className="badge badge-info" style={{ fontSize: 12 }}>
              <Clock size={12} /> Edit Window Open
            </span>
          )}
        </div>
      </div>
      <div className="profile-detail-grid">
        {rows.map(([label, value]) => {
          const isStatusActive = value === "Active";
          const valueClass = "profile-detail-value" + (isStatusActive ? " profile-detail-value-active" : "");
          return (
            <div key={label} className="profile-detail-item">
              <div className="profile-detail-label" title={label}>
                {label}
              </div>
              <div className={valueClass} title={value || "—"}>
                {value || "—"}
              </div>
            </div>
          );
        })}
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
  const [editReqs, setEditReqs] = useState<EditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState(false);
  const [editAddress, setEditAddress] = useState(false);
  const [requestModal, setRequestModal] = useState<string | null>(null); // section name
  const [submitModal, setSubmitModal] = useState<EditRequest | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([profileApi.get(), profileApi.editableSections(), editRequestsApi.my()])
      .then(([p, e, reqs]) => {
        setProfile(p);
        setPerms(e);
        setEditReqs(reqs);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load profile."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const hasAnyPermission = perms.phone || perms.address || perms.certifications;

  const getActiveRequest = (section: string) => {
    return editReqs.find(
      (r) => r.section === section && ["pending", "approved", "changes_submitted"].includes(r.status)
    ) || null;
  };

  const handleRequestEdit = async (section: string, reason: string) => {
    try {
      await editRequestsApi.create({ section, reason });
      setRequestModal(null);
      load();
    } catch (err) {
      throw err;
    }
  };

  const handleSubmitChanges = async (req: EditRequest) => {
    const freshProfile = await profileApi.get();
    let data: Record<string, unknown> = {};
    if (req.section === "phone") {
      data = { mobile_number: freshProfile.mobile_number };
    } else if (req.section === "address") {
      data = { addresses: freshProfile.addresses };
    }
    await editRequestsApi.submitChanges(req.id, data);
    setSubmitModal(null);
    load();
  };

  const formatDateJoined = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleEditClick = () => {
    if (perms.phone) {
      setEditPhone(true);
    } else {
      const el = document.getElementById("personal-info-section");
      el?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleDownloadProfile = () => {
    window.print();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Image too large. Maximum 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const updated = await profileApi.updatePhoto(dataUrl);
        setProfile(updated);
      } catch {
        alert("Failed to upload photo.");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <AsyncState loading={loading} error={error}>
        {profile && (
          <div className="stack">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h1 className="page-header-title" style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>My Profile</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                  <Link to="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link>
                  <span>&gt;</span>
                  <span style={{ color: "var(--primary-color)" }}>My Profile</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-outline" style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8, height: 38 }} onClick={handleDownloadProfile}>
                  <Download size={15} /> Download Profile
                </button>
                <button className="btn" style={{ borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 8, height: 38 }} onClick={handleEditClick}>
                  <Pencil size={15} /> Edit Profile
                </button>
              </div>
            </div>

            <div className="profile-header-card">
              <div className="profile-header-avatar-container">
                {profile.profile_photo ? (
                  <img
                    src={profile.profile_photo}
                    alt={profile.full_name}
                    className="profile-header-avatar"
                  />
                ) : (
                  <div className="profile-header-avatar profile-header-avatar-initials">
                    {profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                )}
                <label className="profile-photo-upload-btn" title="Change photo">
                  <Pencil size={12} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={handlePhotoUpload}
                  />
                </label>
                <div className="profile-header-status-dot" />
              </div>
              <div className="profile-header-info">
                <h2 className="profile-header-name">{profile.full_name}</h2>
                <span className="profile-header-designation">{profile.designation ?? "—"}</span>
                <div className="profile-header-meta">
                  <div className="profile-meta-tag">
                    <User size={13} />
                    <span>{profile.employee_code}</span>
                  </div>
                  <div className="profile-meta-tag">
                    <Briefcase size={13} />
                    <span>{profile.department ?? "—"}</span>
                  </div>
                  <div className="profile-meta-tag">
                    <Calendar size={13} />
                    <span>{profile.date_of_joining ? `Joined on ${formatDateJoined(profile.date_of_joining)}` : "—"}</span>
                  </div>
                </div>
              </div>
              <div className="profile-header-actions">
                <span className="profile-header-badge">
                  {profile.employment_status ?? "Active"}
                </span>
                <button className="profile-action-btn" aria-label="More actions">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>

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
                  {editReqs
                    .filter((r) => r.status === "approved")
                    .map((r) => (
                      <button
                        key={r.id}
                        className="btn btn-sm"
                        style={{ marginTop: 8 }}
                        onClick={() => setSubmitModal(r)}
                      >
                        ✓ Submit {r.section} changes for HR confirmation
                      </button>
                    ))}
                </div>
              </div>
            )}

            <div className="profile-info-grid">
              <Section
                id="personal-info-section"
                title="Personal Information"
                editable={perms.phone}
                onEdit={() => setEditPhone(true)}
                canRequest={!perms.phone}
                onRequestEdit={() => setRequestModal("phone")}
                pendingRequest={getActiveRequest("phone")}
                icon={<User />}
                iconVariant="indigo"
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
                icon={<Briefcase />}
                iconVariant="blue"
                rows={[
                  ["Date of Joining", profile.date_of_joining ?? ""],
                  ["Department", profile.department ?? ""],
                  ["Designation", profile.designation ?? ""],
                  ["Manager", profile.manager_name ?? ""],
                  ["Employment Status", profile.employment_status ?? ""],
                  ["Work Location", profile.work_location ?? ""],
                ]}
              />
            </div>
            <Section
              title="Address & Emergency Contact"
              editable={perms.address}
              onEdit={() => setEditAddress(true)}
              canRequest={!perms.address}
              onRequestEdit={() => setRequestModal("address")}
              pendingRequest={getActiveRequest("address")}
              icon={<MapPin />}
              iconVariant="orange"
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

            {requestModal && (
              <RequestEditModal
                section={requestModal}
                onClose={() => setRequestModal(null)}
                onSubmit={handleRequestEdit}
              />
            )}

            {submitModal && (
              <SubmitChangesModal
                request={submitModal}
                onClose={() => setSubmitModal(null)}
                onSubmit={() => handleSubmitChanges(submitModal)}
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


// ------- Request Edit Access Modal -------

function RequestEditModal({
  section,
  onClose,
  onSubmit,
}: {
  section: string;
  onClose: () => void;
  onSubmit: (section: string, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(section, reason);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Request Edit Access</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: 20 }}>
          <p style={{ marginBottom: 16, color: "var(--text-secondary)" }}>
            You're requesting permission to edit your <strong>{section}</strong> details.
            HR will review your request and grant a time-limited edit window.
          </p>
          <div className="field">
            <label>Reason (optional)</label>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., I moved to a new address, need to update my contact info"
            />
          </div>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-sm" disabled={submitting}>
              {submitting ? "Sending…" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ------- Submit Changes Confirmation Modal -------

function SubmitChangesModal({
  request,
  onClose,
  onSubmit,
}: {
  request: EditRequest;
  onClose: () => void;
  onSubmit: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await onSubmit();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit changes.");
    } finally {
      setSubmitting(false);
    }
  };

  const windowEnd = request.window_end ? new Date(request.window_end).toLocaleString() : "N/A";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Submit Changes for Confirmation</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
          <p style={{ marginBottom: 8, color: "var(--text-secondary)" }}>
            Are you done editing your <strong>{request.section}</strong>? Your changes will be sent to HR for final confirmation.
          </p>
          <p style={{ marginBottom: 16, fontSize: 13, color: "var(--text-tertiary)" }}>
            Edit window expires: {windowEnd}
          </p>
          {error && <p className="error-text" style={{ marginBottom: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" onClick={onClose}>Keep Editing</button>
            <button className="btn btn-sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit for Confirmation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
