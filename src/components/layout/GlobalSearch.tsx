"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAssets } from "@/lib/hooks/useAssets";
import { useIncidents } from "@/lib/hooks/useIncidents";
import { useVulnerabilities } from "@/lib/hooks/useVulnerabilities";
import { navGroups } from "@/lib/nav";

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const assets = useAssets({ page_size: 100 });
  const vulns = useVulnerabilities({ page_size: 100 });
  const incidents = useIncidents({ page_size: 100 });

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (term.length < 2) return [];

    const pages = navGroups.flatMap((group) =>
      group.items
        .filter((item) => item.label.toLowerCase().includes(term))
        .map((item) => ({ id: item.href, label: item.label, href: item.href, kind: "Page" })),
    );
    const assetHits = (assets.data?.data ?? [])
      .filter((item) => item.name.toLowerCase().includes(term))
      .map((item) => ({ id: item.id, label: item.name, href: "/assets", kind: "Asset" }));
    const cveHits = (vulns.data?.data ?? [])
      .filter((item) => (item.cve_id ?? item.title).toLowerCase().includes(term))
      .map((item) => ({
        id: item.id,
        label: `${item.cve_id ?? item.title}`,
        href: "/vulnerabilities",
        kind: "CVE",
      }));
    const incidentHits = (incidents.data?.data ?? [])
      .filter((item) => item.title.toLowerCase().includes(term))
      .map((item) => ({
        id: item.id,
        label: item.title,
        href: `/incidents/${item.id}`,
        kind: "Incident",
      }));

    return [...pages, ...assetHits, ...cveHits, ...incidentHits].slice(0, 8);
  }, [assets.data, vulns.data, incidents.data, query]);

  return (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        aria-label="Search risk objects"
        placeholder="Search assets, CVEs, pages, incidents…"
        className="pl-9"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      {query.trim().length >= 2 ? (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-white/10 bg-[#10182a] py-1 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-slate-500">No matches in live inventory.</li>
          ) : (
            results.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    router.push(item.href);
                    setQuery("");
                  }}
                >
                  <span className="truncate text-slate-100">{item.label}</span>
                  <span className="ml-3 text-[10px] uppercase tracking-wider text-slate-500">{item.kind}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
