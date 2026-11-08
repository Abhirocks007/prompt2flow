import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { LIVE_OAUTH_SLUGS, api } from "../lib/api";
import { serviceMeta } from "../lib/icons";
import type { CatalogItem, IntegrationMe } from "../lib/types";
import { useApp } from "../store/app";

export function ToolsModal() {
  const open = useApp((s) => s.toolsOpen);
  const setToolsOpen = useApp((s) => s.setToolsOpen);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<IntegrationMe[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [query, setQuery] = useState("");

  async function refresh() {
    const [me, all] = await Promise.all([api.integrationsMe(), api.integrations()]);
    setMine(me.integrations);
    setCatalog(all.integrations);
  }

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void refresh().finally(() => setTimeout(() => setLoading(false), 250));
  }, [open]);

  const connectedSlugs = new Set(mine.map((item) => item.integrationSlug));
  const available = useMemo(
    () =>
      catalog.filter(
        (item) =>
          item.slug !== "llm" &&
          !connectedSlugs.has(item.slug) &&
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [catalog, connectedSlugs, query],
  );

  function connect(slug: string) {
    if (!LIVE_OAUTH_SLUGS.has(slug)) return;
    window.location.href = `/api/integrations/${slug}/authorize`;
  }

  async function disconnect(slug: string) {
    await api.disconnect(slug);
    await refresh();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6">
      <div className="flex h-[520px] w-[820px] max-w-full flex-col overflow-hidden rounded-2xl border border-line bg-[#121216] shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Search size={16} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          <button type="button" onClick={() => setToolsOpen(false)} className="text-muted" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted">Loading integrations…</div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-2">
            <div className="overflow-auto border-r border-line p-5">
              <div className="mb-4 text-sm text-muted">Connected</div>
              <div className="space-y-3">
                {mine.length === 0 && <div className="text-xs text-muted">No live accounts connected yet.</div>}
                {mine.map((item) => {
                  const meta = serviceMeta(item.integrationSlug);
                  return (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: meta.bg, color: meta.bg === "#ffffff" ? "#111" : "#fff" }}
                        >
                          {meta.glyph}
                        </span>
                        <div>
                          <div className="text-sm">{item.name}</div>
                          <div className="text-xs text-muted">{item.accountIdentifier}</div>
                          <div className="text-xs text-muted">
                            {item.actionCount}/{item.actionCount} Connected
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                        onClick={() => {
                          if (LIVE_OAUTH_SLUGS.has(item.integrationSlug)) void disconnect(item.integrationSlug);
                        }}
                      >
                        Manage
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="overflow-auto p-5">
              <div className="mb-4 text-sm text-muted">Available to Connect</div>
              <div className="space-y-3">
                {available.map((item) => {
                  const meta = serviceMeta(item.slug);
                  const live = LIVE_OAUTH_SLUGS.has(item.slug);
                  return (
                    <div key={item.slug} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: meta.bg, color: meta.bg === "#ffffff" ? "#111" : "#fff" }}
                        >
                          {meta.glyph}
                        </span>
                        <div className="text-sm">{item.name}</div>
                      </div>
                      <button
                        type="button"
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-accent-strong/50 text-accent disabled:opacity-30"
                        aria-label={`Connect ${item.name}`}
                        onClick={() => connect(item.slug)}
                        disabled={!live}
                        title={live ? `Connect ${item.name}` : "OAuth is not wired for this integration"}
                      >
                        +
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
