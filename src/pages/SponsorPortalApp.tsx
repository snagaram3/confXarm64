import { BotIcon } from "@/components/bot/BotIcon";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { catalog } from "@/lib/catalog";
import type { Booth } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";

type Status = "new" | "qualified" | "contacted";

interface PortalLead {
  id: string;
  name: string;
  email: string;
  company: string;
  role: string;
  interests: string;
  message: string;
  status: Status;
  notes: string;
  consentedAt: string;
  source: string;
}

interface SponsorInfo {
  id: string;
  name: string;
  tagline: string;
  boothNumber: string;
  logo: string | null;
  logoOnDark: boolean;
}

export function SponsorPortalApp({ path }: { path: string }) {
  const demo = path.includes("/demo");
  return demo ? <DemoDashboard /> : <LivePortal />;
}

function LivePortal() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [sponsor, setSponsor] = useState<SponsorInfo | null>(null);
  const [counts, setCounts] = useState<{ total: number; byStatus: Record<Status, number> } | null>(
    null,
  );
  const [leads, setLeads] = useState<PortalLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "">("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sponsor-portal/status")
      .then((r) => r.json() as Promise<{ configured: boolean }>)
      .then((d) => setConfigured(d.configured))
      .catch(() => setConfigured(false));
  }, []);

  async function refresh(nextQ = q, nextStatus = status) {
    const params = new URLSearchParams();
    if (nextQ) params.set("q", nextQ);
    if (nextStatus) params.set("status", nextStatus);
    const res = await fetch(`/api/sponsor-portal/leads?${params}`, { credentials: "same-origin" });
    if (res.status === 401) {
      setSponsor(null);
      return;
    }
    const data = (await res.json()) as {
      leads: PortalLead[];
      counts: { total: number; byStatus: Record<Status, number> };
    };
    setLeads(data.leads);
    setCounts(data.counts);
  }

  useEffect(() => {
    fetch("/api/sponsor-portal/me", { credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as {
          sponsor: SponsorInfo;
          counts: { total: number; byStatus: Record<Status, number> };
        };
        setSponsor(data.sponsor);
        setCounts(data.counts);
        await refresh();
      })
      .catch(() => undefined);
  }, []);

  if (configured === null && !sponsor) {
    return (
      <PortalShell>
        <p className="text-sm text-muted-foreground">Checking exhibitor portal…</p>
      </PortalShell>
    );
  }

  if (configured === false && !sponsor) {
    return (
      <PortalShell>
        <Unconfigured />
      </PortalShell>
    );
  }

  if (!sponsor) {
    return (
      <PortalShell>
        <LoginForm
          onSignedIn={async (info) => {
            setSponsor(info);
            setError(null);
            await refresh();
          }}
          onError={setError}
          error={error}
        />
      </PortalShell>
    );
  }

  const selected = leads.find((l) => l.id === selectedId) ?? leads[0] ?? null;
  const booth = catalog.booths.find((b) => b.id === sponsor.id);

  return (
    <PortalShell>
      <PortalHeader
        booth={booth}
        name={sponsor.name}
        boothNumber={sponsor.boothNumber}
        counts={counts}
        demo={false}
        onLogout={async () => {
          await fetch("/api/sponsor-portal/logout", { method: "POST", credentials: "same-origin" });
          setSponsor(null);
          setLeads([]);
        }}
      />
      <LeadWorkspace
        leads={leads}
        selected={selected}
        q={q}
        status={status}
        demo={false}
        onSearch={(value) => {
          setQ(value);
          void refresh(value, status);
        }}
        onFilter={(value) => {
          setStatus(value);
          void refresh(q, value);
        }}
        onSelect={setSelectedId}
        onPatch={async (id, patch) => {
          const res = await fetch(`/api/sponsor-portal/leads/${id}`, {
            method: "PATCH",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (res.ok) await refresh();
        }}
        onDelete={async (id) => {
          await fetch(`/api/sponsor-portal/leads/${id}`, {
            method: "DELETE",
            credentials: "same-origin",
          });
          setSelectedId(null);
          await refresh();
        }}
        csvHref="/api/sponsor-portal/leads.csv"
      />
    </PortalShell>
  );
}

function DemoDashboard() {
  const sponsorId =
    new URLSearchParams(window.location.search).get("sponsor") ?? catalog.booths[0]?.id ?? "elastic";
  const booth = catalog.booths.find((b) => b.id === sponsorId);
  const [leads, setLeads] = useState<PortalLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<Status | "">("");

  useEffect(() => {
    fetch(`/api/sponsor-portal/demo/leads?sponsorId=${encodeURIComponent(sponsorId)}`)
      .then((r) => r.json() as Promise<{ leads: PortalLead[] }>)
      .then((d) => setLeads(d.leads))
      .catch(() => undefined);
  }, [sponsorId]);

  const filtered = leads.filter((lead) => {
    if (status && lead.status !== status) return false;
    if (!q) return true;
    return `${lead.name} ${lead.email} ${lead.company}`.toLowerCase().includes(q.toLowerCase());
  });
  const selected = filtered.find((l) => l.id === selectedId) ?? filtered[0] ?? null;
  const counts = {
    total: filtered.length,
    byStatus: {
      new: filtered.filter((l) => l.status === "new").length,
      qualified: filtered.filter((l) => l.status === "qualified").length,
      contacted: filtered.filter((l) => l.status === "contacted").length,
    },
  };

  return (
    <PortalShell>
      <p className="rounded-xl border border-maybe/40 bg-maybe/10 px-3 py-2 text-sm text-maybe">
        SAMPLE DATA · reserved example domains · read-only · not the real lead store
      </p>
      <PortalHeader
        booth={booth}
        name={booth?.sponsor ?? "Sample exhibitor"}
        boothNumber={booth?.boothNumber ?? "—"}
        counts={counts}
        demo
      />
      <LeadWorkspace
        leads={filtered}
        selected={selected}
        q={q}
        status={status}
        demo
        onSearch={setQ}
        onFilter={setStatus}
        onSelect={setSelectedId}
      />
    </PortalShell>
  );
}

function PortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100svh] border-t-[3px] border-primary bg-background">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6">{children}</div>
    </div>
  );
}

function Unconfigured() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h1 className="font-display text-2xl font-semibold">Exhibitor portal</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This portal is fail-closed until an operator provisions a sponsor-scoped secret on the
        server. There is no shared default password.
      </p>
      <p className="mt-3 font-mono text-xs text-primary">npm run sponsor:provision -- &lt;exhibitor-id&gt;</p>
      <p className="mt-1 text-sm text-muted-foreground">
        The generated secret is written to a gitignored file under <code>data/</code>. It is never
        bundled into the client.
      </p>
      <a
        href="/sponsor-portal/demo"
        className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
      >
        Open read-only sample dashboard
      </a>
    </div>
  );
}

function LoginForm({
  onSignedIn,
  onError,
  error,
}: {
  onSignedIn: (info: SponsorInfo) => void | Promise<void>;
  onError: (message: string) => void;
  error: string | null;
}) {
  const [sponsorId, setSponsorId] = useState(catalog.booths[0]?.id ?? "");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/sponsor-portal/login", {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sponsorId, secret }),
    });
    const data = (await res.json()) as { error?: string; hint?: string; sponsor?: SponsorInfo };
    setBusy(false);
    setSecret("");
    if (!res.ok || !data.sponsor) {
      onError(data.hint ? `${data.error} ${data.hint}` : (data.error ?? "Sign-in failed"));
      return;
    }
    await onSignedIn(data.sponsor);
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3">
        <BotIcon label="confXarm64 exhibitor portal" />
        <div>
          <h1 className="font-display text-2xl font-semibold">Exhibitor portal</h1>
          <p className="text-sm text-muted-foreground">confXarm64-hosted leads. Not an official sponsor site.</p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sponsorId">Exhibitor</Label>
        <select
          id="sponsorId"
          className="h-11 rounded-md border border-input bg-card px-3 text-sm"
          value={sponsorId}
          onChange={(e) => setSponsorId(e.target.value)}
        >
          {catalog.booths.map((b) => (
            <option key={b.id} value={b.id}>
              {b.sponsor}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="secret">Portal secret</Label>
        <Input
          id="secret"
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          required
        />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" variant="cta" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <a href="/sponsor-portal/demo" className="text-sm text-primary underline">
        View read-only sample data
      </a>
    </form>
  );
}

function PortalHeader({
  booth,
  name,
  boothNumber,
  counts,
  demo,
  onLogout,
}: {
  booth?: Booth;
  name: string;
  boothNumber: string;
  counts: { total: number; byStatus: Record<Status, number> } | null;
  demo: boolean;
  onLogout?: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
      {booth ? <SponsorLogo booth={booth} className="size-12" /> : <BotIcon />}
      <div className="min-w-0 flex-1">
        <p className="font-display text-xl font-semibold">{name}</p>
        <p className="text-sm text-muted-foreground">Booth {boothNumber} · confXarm64 exhibitor portal</p>
      </div>
      {counts && (
        <p className="font-mono text-xs text-primary">
          {counts.total} leads · {counts.byStatus.new} new · {counts.byStatus.qualified} qualified ·{" "}
          {counts.byStatus.contacted} contacted
        </p>
      )}
      {demo && <Badge variant="maybe">Sample</Badge>}
      {onLogout && (
        <Button type="button" variant="outline" onClick={onLogout}>
          Sign out
        </Button>
      )}
    </header>
  );
}

function LeadWorkspace({
  leads,
  selected,
  q,
  status,
  demo,
  onSearch,
  onFilter,
  onSelect,
  onPatch,
  onDelete,
  csvHref,
}: {
  leads: PortalLead[];
  selected: PortalLead | null;
  q: string;
  status: Status | "";
  demo: boolean;
  onSearch: (q: string) => void;
  onFilter: (status: Status | "") => void;
  onSelect: (id: string) => void;
  onPatch?: (id: string, patch: { status?: Status; notes?: string }) => void;
  onDelete?: (id: string) => void;
  csvHref?: string;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col gap-3">
        <Input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, email, company"
          aria-label="Search leads"
        />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pipeline filter">
          {(["", "new", "qualified", "contacted"] as const).map((value) => (
            <button
              key={value || "all"}
              type="button"
              aria-pressed={status === value}
              onClick={() => onFilter(value)}
              className={cn(
                "min-h-11 rounded-full border px-3 text-xs font-semibold uppercase",
                status === value ? "border-primary bg-primary/10 text-primary" : "border-border",
              )}
            >
              {value || "All"}
            </button>
          ))}
        </div>
        {!demo && csvHref && (
          <a href={csvHref} className="text-sm text-primary underline">
            Download CSV
          </a>
        )}
        {leads.length === 0 && (
          <p className="text-sm text-muted-foreground">No opted-in leads yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {leads.map((lead) => (
            <li key={lead.id}>
              <button
                type="button"
                onClick={() => onSelect(lead.id)}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start rounded-xl border px-3 py-2 text-left",
                  selected?.id === lead.id ? "border-primary bg-primary/10" : "border-border bg-card",
                )}
              >
                <span className="font-medium">{lead.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {lead.email} · {lead.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
      {selected && (
        <LeadDetail
          key={selected.id}
          selected={selected}
          demo={demo}
          onPatch={onPatch}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}

function LeadDetail({
  selected,
  demo,
  onPatch,
  onDelete,
}: {
  selected: PortalLead;
  demo: boolean;
  onPatch?: (id: string, patch: { status?: Status; notes?: string }) => void;
  onDelete?: (id: string) => void;
}) {
  const [notes, setNotes] = useState(selected.notes);
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <p className="font-display text-lg font-semibold">{selected.name}</p>
      <p className="font-mono text-sm">{selected.email}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {[selected.company, selected.role].filter(Boolean).join(" · ") || "No company / role"}
      </p>
      {selected.interests && <p className="mt-2 text-sm">Interests · {selected.interests}</p>}
      {selected.message && <p className="mt-2 text-sm">Message · {selected.message}</p>}
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        Consented {selected.consentedAt} · {selected.source} · Contacted is a manual status, not a
        send
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {(["new", "qualified", "contacted"] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={selected.status === value ? "default" : "outline"}
            disabled={demo}
            onClick={() => onPatch?.(selected.id, { status: value })}
          >
            {value}
          </Button>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-1.5">
        <Label htmlFor="notes">Internal notes</Label>
        <textarea
          id="notes"
          disabled={demo}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={demo}
          onClick={() => onPatch?.(selected.id, { notes })}
        >
          Save notes
        </Button>
      </div>
      {onDelete && (
        <Button
          type="button"
          variant="destructive"
          className="mt-4"
          disabled={demo}
          onClick={() => onDelete(selected.id)}
        >
          Remove lead
        </Button>
      )}
    </article>
  );
}
