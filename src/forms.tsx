import { useState, useRef, type FormEvent } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { api } from "./api";
import { Modal } from "./components";
import {
  crewSchema,
  vesselSchema,
  registrationSchema,
  type Crew,
  type Vessel,
  type User,
} from "../shared/domain";
export function AuthForm({
  initial = "login",
  onClose,
  onSuccess,
}: {
  initial?: "login" | "register";
  onClose: () => void;
  onSuccess: (user: User) => void;
}) {
  const [mode, setMode] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    if (mode === "register") {
      const parsed = registrationSchema.safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.issues[0].message);
        return;
      }
    }
    setBusy(true);
    try {
      const data = await api<{ user: User }>(`/auth/${mode}`, "POST", values);
      onSuccess(data.user);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  // Embedded previews can block first-party session cookies. Keep production cookie
  // protections intact and move authentication into a top-level browsing context.
  if (window.self !== window.top)
    return (
      <Modal
        title="A secure place to come aboard."
        description="Open the workspace in a new tab to sign in or create an account without embedded-browser cookie restrictions."
        onClose={onClose}
      >
        <a
          className="button primary"
          href={`${window.location.origin}/login?mode=${mode}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open secure workspace
          <ArrowRight size={17} />
        </a>
        <p className="form-note" style={{ marginTop: 18 }}>
          The preview remains available here. Your account uses secure,
          first-party session cookies rather than third-party tracking or
          browser-stored tokens.
        </p>
      </Modal>
    );
  return (
    <Modal
      title={
        mode === "login"
          ? "Welcome back, captain."
          : "Your next chapter starts here."
      }
      description={
        mode === "login"
          ? "Sign in to your secure operations workspace."
          : "Create a private workspace for your maritime operations."
      }
      onClose={onClose}
    >
      <div className="segmented">
        <button
          onClick={() => {
            setMode("login");
            setError("");
          }}
          className={mode === "login" ? "selected" : ""}
        >
          Sign in
        </button>
        <button
          onClick={() => {
            setMode("register");
            setError("");
          }}
          className={mode === "register" ? "selected" : ""}
        >
          Create workspace
        </button>
      </div>
      <form onSubmit={submit} className="form">
        {mode === "register" && (
          <>
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
            <label>
              Company name
              <input
                name="company"
                autoComplete="organization"
                required
                minLength={2}
                maxLength={80}
              />
            </label>
          </>
        )}
        <label>
          Work email
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@company.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "register" ? 12 : 1}
            maxLength={128}
          />
          {mode === "register" && (
            <small>At least 12 characters. Use a unique passphrase.</small>
          )}
        </label>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={17} />
          ) : (
            <>
              {mode === "login" ? "Sign in" : "Create workspace"}
              <ArrowRight size={17} />
            </>
          )}
        </button>
        <p className="form-note">
          {mode === "login"
            ? "Access is verified by the server. No demo credentials are required to explore the preview."
            : "You will be the workspace owner. No sample records are added to your workspace."}
        </p>
      </form>
    </Modal>
  );
}
export function RecordForm({
  kind,
  record,
  onClose,
  onSaved,
}: {
  kind: "vessels" | "crew";
  record?: Vessel | Crew;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const requestKey = useRef(crypto.randomUUID());
  const vessel = kind === "vessels";
  const v = record as Vessel | undefined;
  const c = record as Crew | undefined;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = (vessel ? vesselSchema : crewSchema).safeParse(data);
    if (!parsed.success) {
      setError(
        parsed.error.issues.map((i) => `${i.path}: ${i.message}`).join(" · "),
      );
      return;
    }
    setBusy(true);
    try {
      await api(
        `/${kind}${record ? "/" + record.id : ""}`,
        record ? "PUT" : "POST",
        { ...parsed.data, ...(record ? { version: record.version } : {}) },
        record ? undefined : requestKey.current,
      );
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await api(`/${kind}/${record!.id}`, "DELETE", {
        version: record!.version,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${record ? "Edit" : "Add"} ${vessel ? "vessel" : "crew member"}`}
      description={
        vessel
          ? "Keep your fleet particulars accurate and up to date."
          : "A clear picture of the people behind every voyage."
      }
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          {vessel ? "Vessel name" : "Full name"}
          <input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={record?.name}
          />
        </label>
        {vessel ? (
          <>
            <div className="form-row">
              <label>
                IMO number
                <input
                  name="imo"
                  required
                  pattern="[0-9]{7}"
                  maxLength={7}
                  defaultValue={v?.imo}
                  placeholder="e.g. 9074729"
                />
              </label>
              <label>
                Vessel type
                <select name="type" defaultValue={v?.type}>
                  {vesselSchema.shape.type.options.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row">
              <label>
                Flag state
                <input
                  name="flag"
                  required
                  minLength={2}
                  maxLength={50}
                  defaultValue={v?.flag}
                />
              </label>
              <label>
                Crew capacity
                <input
                  name="capacity"
                  type="number"
                  min={1}
                  max={500}
                  required
                  defaultValue={v?.capacity || 20}
                />
              </label>
            </div>
            <label>
              Operational status
              <select name="status" defaultValue={v?.status || "In port"}>
                {vesselSchema.shape.status.options.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Destination / current port
              <input
                name="destination"
                maxLength={80}
                defaultValue={v?.destination}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              Email
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                defaultValue={c?.email}
              />
            </label>
            <div className="form-row">
              <label>
                Rank
                <select name="rank" defaultValue={c?.rank}>
                  {crewSchema.shape.rank.options.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Nationality
                <input
                  name="nationality"
                  required
                  minLength={2}
                  maxLength={50}
                  defaultValue={c?.nationality}
                />
              </label>
            </div>
            <label>
              Primary certificate expiry
              <input
                name="certificateExpiry"
                type="date"
                required
                defaultValue={c?.certificateExpiry}
              />
              <small>
                Tracks one primary certificate, not a full STCW compliance
                assessment.
              </small>
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Saving…"
              : record
                ? "Save changes"
                : vessel
                  ? "Add vessel"
                  : "Add crew member"}
            <ArrowRight size={16} />
          </button>
        </div>
        {record && (
          <div className="delete-section">
            {confirmDelete ? (
              <>
                <p>Remove {record.name}? This cannot be undone.</p>
                <button
                  type="button"
                  className="button danger"
                  disabled={busy}
                  onClick={remove}
                >
                  Confirm removal
                </button>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep record
                </button>
              </>
            ) : (
              <button
                type="button"
                className="text-link danger-text"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} /> Remove record
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
export function AssignmentForm({
  crew,
  vessels,
  onClose,
  onSaved,
}: {
  crew: Crew;
  vessels: Vessel[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const vesselId = new FormData(e.currentTarget).get("vesselId") || null;
    setBusy(true);
    try {
      await api(`/crew/${crew.id}/assignment`, "PUT", {
        vesselId,
        version: crew.version,
      });
      await onSaved();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="Plan the next voyage"
      description={`Update the current assignment for ${crew.name}.`}
      onClose={onClose}
    >
      <form className="form" onSubmit={submit}>
        <label>
          Assigned vessel
          <select name="vesselId" defaultValue={crew.vesselId || ""}>
            <option value="">Unassigned / sign off</option>
            {vessels
              .filter(
                (v) => v.status !== "Maintenance" || v.id === crew.vesselId,
              )
              .map((v) => (
                <option
                  value={v.id}
                  key={v.id}
                  disabled={v.status === "Maintenance"}
                >
                  {v.name}
                  {v.status === "Maintenance" ? " (maintenance)" : ""}
                </option>
              ))}
          </select>
        </label>
        <p className="form-note">
          Assignments are saved immediately. Capacity is checked on the server.
          Certificate alerts do not replace an operator's fitness-for-duty
          review.
        </p>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save assignment"}
          <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
