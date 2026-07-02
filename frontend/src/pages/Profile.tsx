import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  Pencil, ShieldCheck, Clock, Send, User, Briefcase, Calendar, MapPin,
  Download, MoreVertical, Trash2, Camera, Share2, LogOut, Mail, Heart,
  Phone, UserCheck, Shield, Sparkles, MapPinCheck, PhoneCall, CheckCircle2
} from "lucide-react";
import { profileApi, type Address, type Profile as ProfileType, type EditableSections } from "../api/profile";
import { editRequestsApi, type EditRequest } from "../api/editRequests";
import { ApiError } from "../api/client";
import AsyncState from "../components/AsyncState";
import { motion } from "framer-motion";


function ProfileActionsMenu({
  hasPhoto,
  onRemovePhoto,
  onDownloadProfile,
}: {
  hasPhoto: boolean;
  onRemovePhoto: () => void;
  onDownloadProfile: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="profile-menu-wrapper">
      <button
        className="profile-action-btn"
        aria-label="More actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical size={16} />
      </button>
      {open && (
        <>
          <div className="profile-menu-backdrop" onClick={() => setOpen(false)} />
          <div className="profile-menu-dropdown">
            <button className="profile-menu-item" onClick={() => { onDownloadProfile(); setOpen(false); }}>
              <Download size={14} />
              <span>Download Profile</span>
            </button>
            <button className="profile-menu-item" onClick={() => { window.print(); setOpen(false); }}>
              <Share2 size={14} />
              <span>Print / Share</span>
            </button>
            {hasPhoto && (
              <button className="profile-menu-item profile-menu-item-danger" onClick={() => { onRemovePhoto(); setOpen(false); }}>
                <Trash2 size={14} />
                <span>Remove Profile Picture</span>
              </button>
            )}
          </div>
        </>
      )}
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
  const [showRequestButtons, setShowRequestButtons] = useState(false);

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
    setShowRequestButtons(true);
    if (perms.phone) {
      setEditPhone(true);
    } else if (perms.address) {
      setEditAddress(true);
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
          <motion.div
            className="stack"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Page Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <h1 className="page-header-title" style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>My Profile</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "var(--text-muted)" }}>
                  <Link to="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Home</Link>
                  <span>&gt;</span>
                  <span style={{ color: "var(--primary-color)" }}>My Profile</span>
                </div>
              </div>
            </div>

            {/* Profile Header Card */}
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
                <button
                  className="btn"
                  style={{
                    borderRadius: 8,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    height: 38,
                    backgroundColor: "#ffffff",
                    color: "#2563eb",
                    fontWeight: 600,
                    border: "none"
                  }}
                  onClick={handleEditClick}
                >
                  <Pencil size={15} /> Edit Profile
                </button>
                <span className="profile-header-badge">
                  {profile.employment_status ?? "Active"}
                </span>
                <ProfileActionsMenu
                  hasPhoto={!!profile.profile_photo}
                  onRemovePhoto={async () => {
                    const updated = await profileApi.removePhoto();
                    setProfile(updated);
                  }}
                  onDownloadProfile={handleDownloadProfile}
                />
              </div>
            </div>

            {/* Dashboard Layout */}
            <div className="profile-dashboard-layout">
              {/* Left Column - Main Info */}
              <div className="profile-main-content">
                {/* Personal Information Card */}
                <div className="card" id="personal-info-section">
                  <div className="row" style={{ marginBottom: 20 }}>
                    <div className="section-title-container">
                      <div className="section-title-icon section-title-indigo">
                        <User size={16} />
                      </div>
                      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Personal Information</h2>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {perms.phone ? (
                        <button className="btn btn-outline btn-sm" onClick={() => setEditPhone(true)}>
                          <Pencil size={14} /> Edit Phone
                        </button>
                      ) : (
                        showRequestButtons && !getActiveRequest("phone") && (
                          <button className="btn btn-outline btn-sm" onClick={() => setRequestModal("phone")}>
                            <Send size={14} /> Request Phone Edit
                          </button>
                        )
                      )}
                      {getActiveRequest("phone")?.status === "pending" && (
                        <span className="badge badge-warning" style={{ fontSize: 12 }}>
                          <Clock size={12} /> Phone Request Pending
                        </span>
                      )}
                      {getActiveRequest("phone")?.status === "approved" && (
                        <span className="badge badge-info" style={{ fontSize: 12 }}>
                          <Clock size={12} /> Phone Edit Open
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="profile-info-row-grid">
                    {[
                      { label: "Employee ID", value: profile.employee_code, icon: <Shield size={16} /> },
                      { label: "Full Name", value: profile.full_name, icon: <User size={16} /> },
                      { label: "Email Address", value: profile.email, icon: <Mail size={16} /> },
                      { label: "Mobile Number", value: profile.mobile_number, icon: <Phone size={16} /> },
                      { label: "Date of Birth", value: profile.date_of_birth, icon: <Calendar size={16} /> },
                      { label: "Gender", value: profile.gender, icon: <UserCheck size={16} /> },
                      { label: "Marital Status", value: profile.marital_status, icon: <Heart size={16} /> },
                    ].map((row, idx) => (
                      <div key={idx} className="profile-info-row">
                        <div className="profile-info-row-icon">{row.icon}</div>
                        <div className="profile-info-row-content">
                          <span className="profile-info-row-label">{row.label}</span>
                          <span className="profile-info-row-value">{row.value || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Address & Emergency Contact Card */}
                <div className="card">
                  <div className="row" style={{ marginBottom: 20 }}>
                    <div className="section-title-container">
                      <div className="section-title-icon section-title-orange">
                        <MapPin size={16} />
                      </div>
                      <h2 style={{ fontSize: 16, fontWeight: 600 }}>Address & Emergency Contacts</h2>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      {perms.address ? (
                        <button className="btn btn-outline btn-sm" onClick={() => setEditAddress(true)}>
                          <Pencil size={14} /> Edit Address
                        </button>
                      ) : (
                        showRequestButtons && !getActiveRequest("address") && (
                          <button className="btn btn-outline btn-sm" onClick={() => setRequestModal("address")}>
                            <Send size={14} /> Request Address Edit
                          </button>
                        )
                      )}
                      {getActiveRequest("address")?.status === "pending" && (
                        <span className="badge badge-warning" style={{ fontSize: 12 }}>
                          <Clock size={12} /> Address Request Pending
                        </span>
                      )}
                      {getActiveRequest("address")?.status === "approved" && (
                        <span className="badge badge-info" style={{ fontSize: 12 }}>
                          <Clock size={12} /> Address Edit Open
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="address-card-group">
                    <div className="address-mini-card">
                      <div className="address-mini-card-icon">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <span className="profile-info-row-label">Current Address</span>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginTop: 6, lineHeight: 1.5 }}>
                          {formatAddress(profile.addresses.find((a) => a.address_type === "current"))}
                        </div>
                      </div>
                    </div>

                    <div className="address-mini-card">
                      <div className="address-mini-card-icon">
                        <MapPinCheck size={20} />
                      </div>
                      <div>
                        <span className="profile-info-row-label">Permanent Address</span>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text)", marginTop: 6, lineHeight: 1.5 }}>
                          {formatAddress(profile.addresses.find((a) => a.address_type === "permanent"))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 20 }}>
                    <div className="emergency-card">
                      <div className="emergency-card-icon">
                        <PhoneCall size={20} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="profile-info-row-label" style={{ color: "#ef4444" }}>Emergency Contact</span>
                        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginTop: 6 }}>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                              {profile.emergency_contacts[0]?.contact_name ?? "—"}
                            </span>
                            {profile.emergency_contacts[0]?.relationship_to && (
                              <span className="badge badge-outline" style={{ marginLeft: 8, fontSize: 11, padding: "2px 8px" }}>
                                {profile.emergency_contacts[0].relationship_to}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>
                            {profile.emergency_contacts[0]?.contact_number ?? "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Sidebar */}
              <div className="profile-sidebar-content">
                {/* Temporary Edit Access Status */}
                {hasAnyPermission && (
                  <div className="card" style={{ borderColor: "rgba(147, 51, 234, 0.25)", background: "var(--primary-light)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <ShieldCheck size={22} style={{ color: "var(--primary-color)" }} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--text)" }}>Temporary Edit Window</h3>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                      You have active permission to edit your details. Changes must be finalized and submitted for HR confirmation.
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                      {editReqs
                        .filter((r) => r.status === "approved")
                        .map((r) => (
                          <button
                            key={r.id}
                            className="btn btn-sm"
                            style={{ justifyContent: "center", width: "100%", marginTop: 8 }}
                            onClick={() => setSubmitModal(r)}
                          >
                            ✓ Submit {r.section} changes
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Employment Information Card */}
                <div className="card">
                  <div className="row" style={{ marginBottom: 16 }}>
                    <div className="section-title-container">
                      <div className="section-title-icon section-title-blue">
                        <Briefcase size={16} />
                      </div>
                      <h2 style={{ fontSize: 15, fontWeight: 600 }}>Employment Details</h2>
                    </div>
                  </div>

                  <div className="employment-sidebar-card">
                    {[
                      { label: "Date of Joining", value: profile.date_of_joining ? formatDateJoined(profile.date_of_joining) : "—", icon: <Calendar size={16} /> },
                      { label: "Department", value: profile.department, icon: <Briefcase size={16} /> },
                      { label: "Designation", value: profile.designation, icon: <Sparkles size={16} /> },
                      { label: "Reporting Manager", value: profile.manager_name, icon: <User size={16} /> },
                      { label: "Employment Status", value: profile.employment_status, icon: <CheckCircle2 size={16} /> },
                      { label: "Work Location", value: profile.work_location, icon: <MapPin size={16} /> },
                    ].map((item, idx) => (
                      <div key={idx} className="employment-sidebar-item">
                        <div className="employment-sidebar-icon">{item.icon}</div>
                        <div className="employment-sidebar-info">
                          <span className="employment-sidebar-label">{item.label}</span>
                          <span className="employment-sidebar-value">{item.value || "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modals */}
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
          </motion.div>
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
