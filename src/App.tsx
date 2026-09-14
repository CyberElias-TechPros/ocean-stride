import {
  useCallback,
  useEffect,
  useState,
  useRef,
  type ReactNode,
} from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Ship,
  Users,
  CalendarDays,
  ShieldCheck,
  Activity,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Anchor,
  Compass,
  Download,
  LifeBuoy,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Check,
  AlertTriangle,
  Clock,
  MapPin,
  Globe2,
  Eye,
} from "lucide-react";
import { api, ApiError } from "./api";
import { demo } from "./demo";
import {
  Logo,
  Modal,
  Badge,
  Empty,
  SectionHeading,
  TextLink,
  OceanChart,
} from "./components";
import { AuthForm, RecordForm, AssignmentForm } from "./forms";
import {
  compliance,
  type User,
  type Workspace,
  type Vessel,
  type Crew,
} from "../shared/domain";
const navigation = [
  { path: "/", label: "Overview", icon: LayoutDashboard },
  { path: "/fleet", label: "Fleet management", icon: Ship },
  { path: "/personnel", label: "Crew & personnel", icon: Users },
  { path: "/assignments", label: "Crew assignments", icon: CalendarDays },
  { path: "/compliance", label: "Compliance", icon: ShieldCheck },
  { path: "/activity", label: "Activity log", icon: Activity },
];
const emptyWorkspace: Workspace = { vessels: [], crew: [], activity: [] };
const statusTone = (status: string) =>
  status === "At sea" || status === "Valid"
    ? "green"
    : status === "In port"
      ? "blue"
      : status === "Expired"
        ? "red"
        : "amber";
function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
}
function shortDate(value: string) {
  return new Date(
    value.length === 10 ? value + "T12:00:00Z" : value,
  ).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
function csvCell(value: unknown) {
  let s = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replaceAll('"', '""') + '"';
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [auth, setAuth] = useState<"login" | "register" | null>(null);
  const [recordForm, setRecordForm] = useState<{
    kind: "vessels" | "crew";
    record?: Vessel | Crew;
  } | null>(null);
  const [assignment, setAssignment] = useState<Crew | null>(null);
  const [detail, setDetail] = useState<Vessel | null>(null);
  const [help, setHelp] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [isMobile, setIsMobile] = useState(
    () => window.matchMedia("(max-width:720px)").matches,
  );
  const requestSequence = useRef(0);
  const identityEpoch = useRef(0);
  useEffect(() => {
    const query = window.matchMedia("(max-width:720px)");
    const update = () => setIsMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (isMobile && sidebar) {
      document.body.style.overflow = "hidden";
      document.querySelector<HTMLAnchorElement>(".sidebar .logo-link")?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, sidebar]);
  const location = useLocation();
  const navigate = useNavigate();
  const isDemo = !user;
  const data = isDemo ? demo : workspace;
  const today = isDemo ? "2026-09-14" : new Date().toISOString().slice(0, 10);
  const alerts = data.crew.filter(
    (c) => compliance(c.certificateExpiry, today) !== "Valid",
  );
  const onboard = data.crew.filter((c) => c.vesselId);
  const atSea = data.vessels.filter((v) => v.status === "At sea");
  const refresh = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError("");
    try {
      const next = await api<Workspace>("/workspace");
      if (sequence === requestSequence.current) setWorkspace(next);
    } catch (e) {
      if (sequence !== requestSequence.current) return;
      setError((e as Error).message);
      if (e instanceof ApiError && e.status === 401) {
        setUser(null);
        setWorkspace(emptyWorkspace);
        setAuth("login");
      }
      throw e;
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    const epoch = identityEpoch.current;
    api<{ user: User }>("/auth/me")
      .then((result) => {
        if (active && epoch === identityEpoch.current) {
          setUser(result.user);
          void refresh().catch(() => {});
        }
      })
      .catch((e) => {
        if (
          active &&
          epoch === identityEpoch.current &&
          (!(e instanceof ApiError) || e.status !== 401)
        )
          setError((e as Error).message);
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    window.scrollTo(0, 0);
    if (location.pathname !== "/login")
      requestAnimationFrame(() =>
        document.getElementById("main")?.focus({ preventScroll: true }),
      );
    setSearch("");
    setFilter("All");
    setPage(1);
    setSidebar(false);
    document.title = `${navigation.find((n) => n.path === location.pathname)?.label || "Workspace"} · Ocean Stride`;
    if (location.pathname === "/login")
      setAuth(
        new URLSearchParams(location.search).get("mode") === "register"
          ? "register"
          : "login",
      );
  }, [location.pathname, location.search]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function onSaved() {
    try {
      await refresh();
      setNotice("Changes saved to your workspace.");
    } catch {
      setNotice(
        "Changes saved. Refresh the workspace to load the latest records.",
      );
    }
  }
  function edit(kind: "vessels" | "crew", record?: Vessel | Crew) {
    if (isDemo) {
      setAuth("register");
      return;
    }
    setRecordForm({ kind, record });
  }
  function assign(crew: Crew) {
    if (isDemo) {
      setAuth("register");
      return;
    }
    setAssignment(crew);
  }
  async function logout() {
    try {
      await api("/auth/logout", "POST", {});
      requestSequence.current++;
      identityEpoch.current++;
      setLoading(false);
      setUser(null);
      setWorkspace(emptyWorkspace);
      navigate("/");
      setNotice("You have been securely signed out.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function exportReport() {
    const rows = [
      [
        "Ocean Stride",
        isDemo ? "Illustrative demo data" : "Workspace report",
        today,
      ],
      [],
      [
        "Vessel",
        "IMO",
        "Type",
        "Flag",
        "Status",
        "Destination",
        "Crew",
        "Capacity",
      ],
      ...data.vessels.map((v) => [
        v.name,
        v.imo,
        v.type,
        v.flag,
        v.status,
        v.destination,
        data.crew.filter((c) => c.vesselId === v.id).length,
        v.capacity,
      ]),
      [],
      [
        "Crew member",
        "Rank",
        "Nationality",
        "Vessel",
        "Certificate expiry",
        "Certificate status",
      ],
      ...data.crew.map((c) => [
        c.name,
        c.rank,
        c.nationality,
        data.vessels.find((v) => v.id === c.vesselId)?.name || "Unassigned",
        c.certificateExpiry,
        compliance(c.certificateExpiry, today),
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocean-stride-${isDemo ? "demo-" : ""}${today}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Operations report downloaded.");
  }
  const filteredVessels = data.vessels.filter(
    (v) =>
      (filter === "All" || v.status === filter) &&
      `${v.name} ${v.imo} ${v.flag} ${v.destination}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const filteredCrew = data.crew.filter(
    (c) =>
      (location.pathname !== "/compliance" ||
        filter === "All" ||
        compliance(c.certificateExpiry, today) === filter) &&
      (location.pathname === "/compliance" ||
        filter === "All" ||
        (filter === "On board" ? !!c.vesselId : !c.vesselId)) &&
      `${c.name} ${c.rank} ${c.nationality} ${c.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function tools(placeholder: string, options: string[], count: number) {
    return (
      <div className="table-tools">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label={placeholder}
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              aria-label="Clear search"
              className="icon-button"
              onClick={() => setSearch("")}
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="filter-group">
          {options.map((option) => (
            <button
              key={option}
              className={filter === option ? "selected" : ""}
              onClick={() => {
                setFilter(option);
                setPage(1);
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <span className="result-count">{count} records</span>
      </div>
    );
  }
  function pagination(count: number) {
    return (
      <div className="pagination">
        <span>
          {count
            ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, count)} of ${count}`
            : "0 records"}
        </span>
        <div>
          <button
            className="icon-button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>Page {page}</span>
          <button
            className="icon-button"
            aria-label="Next page"
            disabled={page * 10 >= count}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    );
  }
  function fleetTable(vessels: Vessel[]) {
    return vessels.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>VESSEL NAME</th>
              <th>STATUS</th>
              <th>DESTINATION / PORT</th>
              <th>CREW ON BOARD</th>
              <th>
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {vessels.map((v, i) => {
              const count = data.crew.filter((c) => c.vesselId === v.id).length;
              return (
                <tr key={v.id}>
                  <td>
                    <button className="name-cell" onClick={() => setDetail(v)}>
                      <span className={`vessel-avatar variant-${i % 3}`}>
                        <Ship size={23} />
                      </span>
                      <span>
                        <strong>{v.name}</strong>
                        <small>
                          {v.type} <span className="dot">·</span> IMO {v.imo}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>
                    <Badge tone={statusTone(v.status)}>{v.status}</Badge>
                  </td>
                  <td>
                    <span className="destination">
                      <MapPin size={13} />
                      {v.destination || "Not set"}
                    </span>
                  </td>
                  <td>
                    <div className="crew-meter">
                      <span>
                        <strong>{count}</strong>
                        <span> / {v.capacity}</span>
                      </span>
                      <div>
                        <i
                          style={{ width: `${(count / v.capacity) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View ${v.name}`}
                      onClick={() => setDetail(v)}
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title={
          search || filter !== "All"
            ? "No vessels match your search"
            : "Your next voyage starts here"
        }
        text={
          search || filter !== "All"
            ? "Try a different search or clear your filters."
            : "Add your first vessel to start building your fleet."
        }
        action={
          !search && filter === "All" ? (
            <button className="button primary" onClick={() => edit("vessels")}>
              <Plus size={16} />
              Add vessel
            </button>
          ) : undefined
        }
      />
    );
  }
  function crewTable(crew: Crew[], mode = "personnel") {
    return crew.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>CREW MEMBER</th>
              <th>RANK / NATIONALITY</th>
              <th>CURRENT VESSEL</th>
              <th>CERTIFICATE</th>
              <th>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {crew.map((c, i) => (
              <tr key={c.id}>
                <td>
                  <button className="name-cell" onClick={() => edit("crew", c)}>
                    <span className={`person-avatar variant-${i % 3}`}>
                      {initials(c.name)}
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.email}</small>
                    </span>
                  </button>
                </td>
                <td>
                  <strong className="cell-text">{c.rank}</strong>
                  <small className="cell-muted">{c.nationality}</small>
                </td>
                <td>
                  {c.vesselId ? (
                    <span className="destination">
                      <Ship size={14} />
                      {data.vessels.find((v) => v.id === c.vesselId)?.name ||
                        "Unknown vessel"}
                    </span>
                  ) : (
                    <span className="cell-muted">Available for assignment</span>
                  )}
                </td>
                <td>
                  <Badge
                    tone={statusTone(compliance(c.certificateExpiry, today))}
                  >
                    {compliance(c.certificateExpiry, today)}
                  </Badge>
                  <small className="cell-muted">
                    {shortDate(c.certificateExpiry)}
                  </small>
                </td>
                <td>
                  <button
                    className="text-link"
                    onClick={() =>
                      mode === "compliance" ? edit("crew", c) : assign(c)
                    }
                  >
                    {mode === "compliance"
                      ? "Update"
                      : c.vesselId
                        ? "Reassign"
                        : "Assign"}
                    <ArrowUpRight size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <Empty
        title={
          search || filter !== "All"
            ? "No crew match these filters"
            : "People make every voyage possible"
        }
        text={
          search || filter !== "All"
            ? "Try a different name, rank, or status."
            : "Add your first crew member to manage assignments and certificate dates."
        }
        action={
          !search && filter === "All" ? (
            <button className="button primary" onClick={() => edit("crew")}>
              <Plus size={16} />
              Add crew member
            </button>
          ) : undefined
        }
      />
    );
  }
  function pageIntro(
    eyebrow: string,
    title: string,
    text: string,
    action?: ReactNode,
  ) {
    return (
      <div className="page-intro">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{text}</p>
        </div>
        {action}
      </div>
    );
  }
  function activityList() {
    return data.activity.length ? (
      <div className="activity-list">
        {data.activity.map((a, i) => (
          <div className="activity-item" key={a.id}>
            <span className="activity-dot">
              {i % 2 ? <Ship size={15} /> : <Check size={15} />}
            </span>
            <div>
              <p>{a.message}</p>
              <time dateTime={a.createdAt}>
                {shortDate(a.createdAt)} ·{" "}
                {new Date(a.createdAt).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "UTC",
                })}{" "}
                UTC
              </time>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <Empty
        title="A fresh logbook"
        text="Saved changes to your fleet and crew will appear here."
      />
    );
  }
  let content: ReactNode;
  if (location.pathname === "/")
    content = (
      <>
        <div className="overview-greeting">
          <div>
            <span className="eyebrow">YOUR OPERATIONS, IN SIGHT</span>
            <h1>
              {user
                ? `Welcome aboard, ${user.name.split(" ")[0]}.`
                : "A clearer course. A stronger crew."}
            </h1>
          </div>
          <span className="date-label">
            <CalendarDays size={15} />
            {shortDate(today)}
            <span>UTC</span>
          </span>
        </div>
        <section className="hero">
          <img
            src="/images/ocean.jpg"
            alt="A cargo vessel carving a path through the open ocean"
            fetchPriority="high"
          />
          <div className="hero-shade" />
          <div className="hero-content">
            <span className="hero-kicker">
              <span /> THE BIG PICTURE
            </span>
            <h2>
              Every vessel.
              <br />
              Every person.
              <br />
              <em>One horizon.</em>
            </h2>
            <p>
              Bring your fleet, crew, and compliance together.
              <br />
              Move forward with confidence.
            </p>
            <button className="button lime" onClick={() => navigate("/fleet")}>
              Explore your fleet
              <ArrowUpRight size={17} />
            </button>
          </div>
          <div className="hero-coordinate">
            <Compass size={24} />
            <span>
              BUILT FOR THE PEOPLE
              <br />
              BEHIND EVERY VOYAGE
            </span>
          </div>
          <div className="hero-index">
            <span>01 — OPERATIONS</span>
            <i />
            <span>OCEAN STRIDE</span>
          </div>
        </section>
        <section className="stats-grid" aria-label="Operations summary">
          {[
            {
              label: "Total vessels",
              value: data.vessels.length,
              sub: `${atSea.length} currently at sea`,
              icon: Ship,
              to: "/fleet",
              type: "green",
            },
            {
              label: "Crew members",
              value: data.crew.length,
              sub: `${onboard.length} on board · ${data.crew.length - onboard.length} available`,
              icon: Users,
              to: "/personnel",
              type: "blue",
            },
            {
              label: "Certificate health",
              value: data.crew.length
                ? `${Math.round(((data.crew.length - alerts.length) / data.crew.length) * 100)}%`
                : "—",
              sub: "Primary certificates valid beyond 30 days",
              icon: ShieldCheck,
              to: "/compliance",
              type: "green",
            },
            {
              label: "Needs attention",
              value: alerts.length,
              sub: "Certificates expired or due within 30 days",
              icon: AlertTriangle,
              to: "/compliance",
              type: "amber",
            },
          ].map((s, i) => (
            <button
              className={`stat-card stat-${i}`}
              key={s.label}
              onClick={() => navigate(s.to)}
            >
              <div className="stat-top">
                <span>{s.label}</span>
                <s.icon size={18} />
              </div>
              <div className="stat-value">
                {s.value}
                <ArrowUpRight size={19} />
              </div>
              <div className={`stat-sub ${s.type}`}>
                <i />
                {s.sub}
              </div>
            </button>
          ))}
        </section>
        <section className="panel fleet-panel">
          <SectionHeading
            title="Your fleet, at a glance"
            eyebrow="FLEET OPERATIONS"
            action={
              <TextLink onClick={() => navigate("/fleet")}>
                View all vessels
              </TextLink>
            }
          />
          {fleetTable(data.vessels.slice(0, 4))}
        </section>
        <div className="bottom-grid">
          <section className="routes-panel">
            <SectionHeading
              title="Beyond borders. Always connected."
              eyebrow="A GLOBAL PERSPECTIVE"
            />
            <OceanChart />
          </section>
          <section className="panel attention-panel">
            <SectionHeading
              title="On your radar"
              eyebrow="PRIORITY WATCH"
              action={<span className="count-pill">{alerts.length}</span>}
            />
            {alerts.length ? (
              <div className="attention-list">
                {alerts.slice(0, 3).map((c) => (
                  <button key={c.id} onClick={() => navigate("/compliance")}>
                    <span
                      className={`alert-icon ${statusTone(compliance(c.certificateExpiry, today))}`}
                    >
                      <Clock size={17} />
                    </span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>
                        Certificate{" "}
                        {compliance(c.certificateExpiry, today) === "Expired"
                          ? "expired"
                          : "expires"}{" "}
                        {shortDate(c.certificateExpiry)}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="all-clear">
                <ShieldCheck size={28} />
                <h3>
                  {data.crew.length
                    ? "A clear horizon"
                    : "No certificates tracked yet"}
                </h3>
                <p>
                  {data.crew.length
                    ? "No certificates are due within 30 days."
                    : "Add crew to start your certificate watch."}
                </p>
              </div>
            )}
            <button
              className="attention-link"
              onClick={() => navigate("/compliance")}
            >
              Open compliance center
              <ArrowRight size={15} />
            </button>
          </section>
        </div>
      </>
    );
  else if (location.pathname === "/fleet")
    content = (
      <>
        {pageIntro(
          "FLEET OPERATIONS",
          "A fleet with a clear direction.",
          "Vessel particulars, operational status, and the people on board.",
          <button className="button primary" onClick={() => edit("vessels")}>
            <Plus size={17} />
            Add vessel
          </button>,
        )}
        <div className="mini-stats">
          {["At sea", "In port", "Maintenance"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setFilter(s);
                setPage(1);
              }}
            >
              <span>{s}</span>
              <strong>
                {data.vessels.filter((v) => v.status === s).length}
              </strong>
              <ArrowUpRight size={18} />
            </button>
          ))}
        </div>
        <section className="panel">
          {tools(
            "Search vessels, IMO, or port…",
            ["All", "At sea", "In port", "Maintenance"],
            filteredVessels.length,
          )}
          {fleetTable(filteredVessels.slice((page - 1) * 10, page * 10))}
          {pagination(filteredVessels.length)}
        </section>
      </>
    );
  else if (
    ["/personnel", "/assignments", "/compliance"].includes(location.pathname)
  ) {
    const mode = location.pathname.slice(1);
    content = (
      <>
        {pageIntro(
          mode === "compliance"
            ? "CERTIFICATE WATCH"
            : mode === "assignments"
              ? "CREW PLANNING"
              : "PEOPLE & PERSONNEL",
          mode === "compliance"
            ? "Stay ahead of the horizon."
            : mode === "assignments"
              ? "The right crew. The next voyage."
              : "Good people. Great journeys.",
          mode === "compliance"
            ? "Track primary certificate expiry. This is an operational reminder, not a full regulatory assessment."
            : mode === "assignments"
              ? "Assign crew to your fleet or sign them off. Capacity is enforced on every update."
              : "Keep the people behind your operations in one organized workspace.",
          <button className="button primary" onClick={() => edit("crew")}>
            <Plus size={17} />
            Add crew member
          </button>,
        )}
        {mode === "compliance" && (
          <div className="mini-stats">
            {["Valid", "Expiring soon", "Expired"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setPage(1);
                }}
              >
                <span>{s}</span>
                <strong>
                  {
                    data.crew.filter(
                      (c) => compliance(c.certificateExpiry, today) === s,
                    ).length
                  }
                </strong>
                <ArrowUpRight size={18} />
              </button>
            ))}
          </div>
        )}
        <section className="panel">
          {tools(
            "Search crew, rank, or nationality…",
            mode === "compliance"
              ? ["All", "Valid", "Expiring soon", "Expired"]
              : ["All", "On board", "Available"],
            filteredCrew.length,
          )}
          {crewTable(filteredCrew.slice((page - 1) * 10, page * 10), mode)}
          {pagination(filteredCrew.length)}
        </section>
      </>
    );
  } else if (location.pathname === "/activity")
    content = (
      <>
        {pageIntro(
          "THE OPERATIONS LOGBOOK",
          "Every change. A clear record.",
          "The latest 100 saved fleet and personnel events, recorded in UTC.",
        )}
        <section className="panel">{activityList()}</section>
      </>
    );
  else if (location.pathname === "/settings")
    content = (
      <>
        {pageIntro(
          "WORKSPACE",
          "A workspace that works for you.",
          "Your account, your organization, and your operational data.",
        )}
        <div className="settings-grid">
          <section className="panel settings-panel">
            <Users size={24} />
            <h2>{user?.company || "Preview workspace"}</h2>
            <dl>
              <dt>Name</dt>
              <dd>{user?.name || "Guest explorer"}</dd>
              <dt>Email</dt>
              <dd>{user?.email || "Not signed in"}</dd>
              <dt>Access</dt>
              <dd>{user ? "Workspace owner" : "Read-only sample data"}</dd>
              <dt>Storage</dt>
              <dd>
                {user
                  ? "Cloudflare D1"
                  : "Illustrative preview — not persisted"}
              </dd>
            </dl>
            {user ? (
              <button className="button secondary" onClick={logout}>
                <LogOut size={16} />
                Sign out securely
              </button>
            ) : (
              <button
                className="button primary"
                onClick={() => setAuth("register")}
              >
                Create your workspace
                <ArrowRight size={16} />
              </button>
            )}
          </section>
          <section className="panel settings-panel">
            <Download size={24} />
            <h2>Your data, in your hands.</h2>
            <p>
              Export a CSV snapshot of your fleet, personnel, and certificate
              status. Store exports securely; they contain personal data.
            </p>
            <button className="button secondary" onClick={exportReport}>
              Export operations report
              <Download size={16} />
            </button>
            <hr />
            <h3>Need a hand?</h3>
            <p>
              Learn how to manage your first vessel, plan crew assignments, and
              understand certificate alerts.
            </p>
            <button className="text-link" onClick={() => setHelp(true)}>
              Read the field guide
              <ArrowUpRight size={16} />
            </button>
          </section>
        </div>
      </>
    );
  else if (location.pathname === "/login")
    content = (
      <>
        {pageIntro(
          "SECURE ACCESS",
          "Welcome aboard.",
          "Sign in to access your saved maritime operations.",
        )}
        <button className="button primary" onClick={() => setAuth("login")}>
          Sign in
          <ArrowRight size={17} />
        </button>
      </>
    );
  else
    content = (
      <Empty
        title="Uncharted waters"
        text="This page isn’t on our chart. Let’s get you back on course."
        action={
          <button className="button primary" onClick={() => navigate("/")}>
            Return to overview
            <ArrowRight size={17} />
          </button>
        }
      />
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebar ? "open" : ""}`}
        ref={(el) => {
          if (el) el.inert = isMobile && !sidebar;
        }}
        aria-hidden={isMobile && !sidebar ? true : undefined}
        role={isMobile ? "dialog" : undefined}
        aria-modal={isMobile && sidebar ? true : undefined}
        aria-label={isMobile ? "Workspace navigation" : undefined}
        onKeyDown={(event) => {
          if (!isMobile || !sidebar) return;
          if (event.key === "Escape") {
            setSidebar(false);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLButtonElement>(".mobile-menu")
                ?.focus(),
            );
          }
          if (event.key === "Tab") {
            const items = event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href],button:not(:disabled)",
            );
            const first = items[0],
              last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <NavLink to="/" className="logo-link" aria-label="Ocean Stride home">
          <Logo />
        </NavLink>
        <button
          className="workspace-switch"
          onClick={() => navigate("/settings")}
        >
          <span className="workspace-icon">
            <Anchor size={18} />
          </span>
          <span>
            <strong>{user?.company || "Ocean Stride"}</strong>
            <small>{user ? "Operations workspace" : "Preview workspace"}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map((n) => (
            <NavLink
              key={n.path}
              to={n.path}
              end
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.path === "/compliance" && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink
            to="/settings"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <Settings size={19} />
            <span>Settings</span>
          </NavLink>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <LifeBuoy size={19} />
            <span>Help & field guide</span>
            <ArrowUpRight size={15} />
          </button>
          <div className="sidebar-note">
            <Compass size={24} />
            <p>
              Built for the journey.
              <br />
              <strong>Ready for what’s next.</strong>
            </p>
            <span>THE OCEAN STRIDE WAY</span>
          </div>
          <button
            className="profile"
            onClick={() => (user ? navigate("/settings") : setAuth("login"))}
          >
            <span className="profile-avatar">
              {user ? initials(user.name) : "OS"}
            </span>
            <span>
              <strong>{user?.name || "Welcome aboard"}</strong>
              <small>
                {user ? "Workspace owner" : "Sign in to your workspace"}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      <div
        className="main-shell"
        ref={(el) => {
          if (el) el.inert = isMobile && sidebar;
        }}
        aria-hidden={isMobile && sidebar ? true : undefined}
      >
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={21} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {navigation.find((n) => n.path === location.pathname)?.label ||
                "Settings"}
            </strong>
          </div>
          <div className="top-actions">
            <span className="system-status">
              <i />
              {checking
                ? "Connecting…"
                : isDemo
                  ? "Interactive preview"
                  : "Private workspace"}
            </span>
            <button
              className="icon-button notification-button"
              aria-label={`${alerts.length} certificate alerts`}
              onClick={() => navigate("/compliance")}
            >
              <Bell size={19} />
              {alerts.length > 0 && <i />}
            </button>
            <span className="top-divider" />
            <button
              className="top-avatar"
              aria-label={user ? "Account settings" : "Sign in"}
              onClick={() => (user ? navigate("/settings") : setAuth("login"))}
            >
              {user ? initials(user.name) : "OS"}
            </button>
          </div>
        </header>
        {isDemo && (
          <div className="demo-banner">
            <span>
              <Eye size={14} />
              <strong>A look inside Ocean Stride.</strong>{" "}
              <span>Explore illustrative data, then make it your own.</span>
            </span>
            <button onClick={() => setAuth("register")}>
              Create workspace
              <ArrowRight size={14} />
            </button>
          </div>
        )}
        <main id="main" tabIndex={-1} key={location.pathname}>
          <div className="main-toolbar">
            <span>
              <Globe2 size={13} /> MARITIME OPERATIONS, REIMAGINED
            </span>
            <div>
              <button className="text-link" onClick={exportReport}>
                <Download size={14} />
                Export report
              </button>
              {user && (
                <button
                  className="icon-button"
                  aria-label="Refresh workspace"
                  disabled={loading}
                  onClick={() => void refresh().catch(() => {})}
                >
                  <RefreshCw size={15} className={loading ? "spin" : ""} />
                </button>
              )}
            </div>
          </div>
          {error && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                onClick={() =>
                  user ? void refresh().catch(() => {}) : setAuth("login")
                }
              >
                {user ? "Retry" : "Sign in"}
              </button>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading && user && (
            <div role="status" className="loading-bar">
              Synchronizing your operations…
            </div>
          )}
          {content}
          <footer>
            <span>
              <Anchor size={13} /> OCEAN STRIDE{" "}
              <span className="footer-divider">/</span> A clearer course
              forward.
            </span>
            <span>
              {isDemo
                ? "ILLUSTRATIVE DATA · 14 SEP 2026"
                : "PRIVATE WORKSPACE · CLOUDFLARE D1"}
              <i />
            </span>
          </footer>
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {auth && (
        <AuthForm
          initial={auth}
          onClose={() => setAuth(null)}
          onSuccess={(u) => {
            requestSequence.current++;
            identityEpoch.current++;
            setUser(u);
            setAuth(null);
            setWorkspace(emptyWorkspace);
            navigate("/");
            void refresh().catch(() => {});
          }}
        />
      )}
      {recordForm && (
        <RecordForm
          {...recordForm}
          onClose={() => setRecordForm(null)}
          onSaved={onSaved}
        />
      )}{" "}
      {assignment && (
        <AssignmentForm
          crew={assignment}
          vessels={data.vessels}
          onClose={() => setAssignment(null)}
          onSaved={onSaved}
        />
      )}
      {detail && (
        <Modal
          title={detail.name}
          description={`${detail.type} · IMO ${detail.imo}`}
          onClose={() => setDetail(null)}
        >
          <div className="vessel-detail-art">
            <Ship size={70} />
            <Badge tone={statusTone(detail.status)}>{detail.status}</Badge>
          </div>
          <dl className="detail-grid">
            <div>
              <dt>Flag state</dt>
              <dd>{detail.flag}</dd>
            </div>
            <div>
              <dt>Destination / port</dt>
              <dd>{detail.destination || "Not set"}</dd>
            </div>
            <div>
              <dt>Crew capacity</dt>
              <dd>{detail.capacity}</dd>
            </div>
            <div>
              <dt>Currently on board</dt>
              <dd>
                {data.crew.filter((c) => c.vesselId === detail.id).length}
              </dd>
            </div>
          </dl>
          <h3 className="detail-title">Crew manifest</h3>
          {data.crew.filter((c) => c.vesselId === detail.id).length ? (
            data.crew
              .filter((c) => c.vesselId === detail.id)
              .map((c) => (
                <div className="manifest-row" key={c.id}>
                  <span>{c.name}</span>
                  <small>{c.rank}</small>
                </div>
              ))
          ) : (
            <p className="form-note">No crew assigned to this vessel.</p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => {
                setDetail(null);
                navigate("/assignments");
              }}
            >
              Manage crew
            </button>
            <button
              className="button primary"
              onClick={() => {
                setDetail(null);
                edit("vessels", detail);
              }}
            >
              {isDemo ? "Create your workspace" : "Edit vessel"}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Your operations field guide"
          description="A straightforward guide to getting underway."
          onClose={() => setHelp(false)}
        >
          <div className="guide">
            <div>
              <span>01</span>
              <section>
                <h3>Create your workspace</h3>
                <p>
                  Register with your name, company, email, and a unique
                  passphrase. Your workspace starts empty and is isolated from
                  other organizations.
                </p>
              </section>
            </div>
            <div>
              <span>02</span>
              <section>
                <h3>Build your fleet & crew</h3>
                <p>
                  Add a vessel with a valid IMO number, flag, and capacity. Add
                  personnel with their rank and primary certificate expiry date.
                </p>
              </section>
            </div>
            <div>
              <span>03</span>
              <section>
                <h3>Plan, monitor, move forward</h3>
                <p>
                  Use Crew assignments to assign or sign off personnel. Watch
                  certificates due within 30 days in Compliance. Export your
                  operations report at any time.
                </p>
              </section>
            </div>
          </div>
          <p className="form-note">
            This release supports workspace owners. Payroll, document uploads,
            invitations, password recovery, and live AIS tracking are not
            available. The map is an illustration, not a navigation aid.
          </p>
          <button className="button primary" onClick={() => setHelp(false)}>
            Ready to explore
            <ArrowRight size={16} />
          </button>
        </Modal>
      )}
    </div>
  );
}
