import { BotIcon } from "@/components/bot/BotIcon";
import { SponsorLogo } from "@/components/sponsor/SponsorLogo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { catalog } from "@/lib/catalog";
import type { Booth } from "@/lib/types";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

interface Meta {
  sponsorId: string;
  name: string;
  tagline: string;
  boothNumber: string;
  logo: string | null;
  logoOnDark: boolean;
  consentVersion: string;
  consentText: string;
  notice: string;
}

export function ConnectPage({ sponsorId }: { sponsorId: string }) {
  const booth = catalog.booths.find((b) => b.id === sponsorId);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"form" | "success" | "duplicate">("form");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    interests: "",
    message: "",
  });

  const source = useMemo(() => {
    const q = new URLSearchParams(window.location.search).get("from");
    return q === "link" ? "link" : "card";
  }, []);

  useEffect(() => {
    fetch(`/api/leads/meta/${encodeURIComponent(sponsorId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Unknown exhibitor");
        return res.json() as Promise<Meta>;
      })
      .then(setMeta)
      .catch(() => setError("This exhibitor is not in the confXarm64 sample catalog."));
  }, [sponsorId]);

  const displayBooth: Booth | undefined = booth;
  const shareUrl =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/connect/${sponsorId}?from=link`;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!meta || !consent) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sponsorId,
          ...form,
          consent: true,
          consentVersion: meta.consentVersion,
          source,
        }),
      });
      const data = (await res.json()) as { error?: string; code?: string };
      if (res.status === 409) {
        setStatus("duplicate");
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "Could not send this.");
        return;
      }
      setStatus("success");
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fg-shell fg-paper-noise min-h-[100svh] bg-[color:var(--fg-paper)]">
      <div className="fg-page mx-auto flex max-w-xl flex-col gap-6 px-5 py-10">
        <header className="flex items-center gap-3">
          <BotIcon label="confXarm64" />
          <div>
            <p className="font-display text-lg font-medium">Share details</p>
            <p className="fg-eyebrow mt-1">confXarm64 exhibitor connect · not an official organizer form</p>
          </div>
        </header>

        {displayBooth && (
          <div className="fg-card flex items-center gap-3 p-4">
            <SponsorLogo booth={displayBooth} className="size-14" />
            <div>
              <p className="font-display text-xl font-medium">{displayBooth.sponsor}</p>
              <p className="text-sm text-[color:var(--fg-muted)]">
                Booth {displayBooth.boothNumber} · {displayBooth.tagline}
              </p>
            </div>
          </div>
        )}

        {meta && <p className="text-sm text-[color:var(--fg-muted)]">{meta.notice}</p>}

        {status === "success" && (
          <p role="status" className="fg-alert fg-alert-teal">
            Sent. {meta?.name ?? "This exhibitor"} can contact you with the details you typed. You can close this page.
          </p>
        )}
        {status === "duplicate" && (
          <p role="status" className="fg-alert fg-alert-gold">
            You already shared details with this exhibitor. Nothing new was stored.
          </p>
        )}
        {error && (
          <p role="alert" className="fg-alert fg-alert-error">
            {error}
          </p>
        )}

        {status === "form" && meta && (
          <form className="fg-card fg-card-pad flex flex-col gap-4" onSubmit={onSubmit}>
            <Field label="Name" htmlFor="name" required>
              <input
                id="name"
                className="fg-input"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Email" htmlFor="email" required>
              <input
                id="email"
                className="fg-input"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </Field>
            <Field label="Company" htmlFor="company">
              <input
                id="company"
                className="fg-input"
                autoComplete="organization"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </Field>
            <Field label="Role" htmlFor="role">
              <input
                id="role"
                className="fg-input"
                autoComplete="organization-title"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              />
            </Field>
            <Field label="Interests" htmlFor="interests">
              <input
                id="interests"
                className="fg-input"
                value={form.interests}
                onChange={(e) => setForm({ ...form, interests: e.target.value })}
              />
            </Field>
            <Field label="Message" htmlFor="message">
              <textarea
                id="message"
                rows={3}
                className="fg-textarea"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
            </Field>

            <label className="flex items-start gap-3 rounded-[16px] border border-[color:var(--fg-line)] bg-[color:var(--fg-sunk)] p-3 text-sm leading-relaxed">
              <Checkbox
                checked={consent}
                onCheckedChange={(v) => setConsent(v === true)}
                className="mt-0.5 size-5"
                aria-required="true"
              />
              <span>
                <span className="font-medium">Contact consent</span>
                <span className="mt-1 block text-[color:var(--fg-muted)]">{meta.consentText}</span>
              </span>
            </label>

            <Button type="submit" variant="guide" disabled={!consent || busy}>
              {busy ? "Sending…" : `Share with ${meta.name}`}
            </Button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="guideGhost"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? "Link copied" : "Copy booth link"}
          </Button>
          <a href="/" className="fg-link inline-flex min-h-11 items-center px-3 text-sm underline">
            Back to confXarm64
          </a>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label}
        {required ? "" : <span className="ml-1 font-normal text-[color:var(--fg-muted)]">optional</span>}
      </label>
      {children}
    </div>
  );
}
