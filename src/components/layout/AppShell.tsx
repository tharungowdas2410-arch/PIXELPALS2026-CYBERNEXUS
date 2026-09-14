"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNavigation } from "@/components/layout/TopNavigation";
import { DemoControlBar } from "@/components/layout/DemoControlBar";
import { CommandPalette } from "@/components/enterprise/CommandPalette";
import { useAuth } from "@/components/auth-provider";
import { getMyOrganization } from "@/lib/api/organizations";
import { useDashboard } from "@/lib/hooks/useDashboard";
import { useIncidents } from "@/lib/hooks/useIncidents";
import { queryKeys } from "@/lib/query-keys";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const isPublic = pathname === "/login" || pathname === "/register";
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { user, logout } = useAuth();
  const org = useQuery({
    queryKey: queryKeys.organization,
    queryFn: getMyOrganization,
    enabled: !isPublic && Boolean(user),
  });
  const dashboard = useDashboard("30d", !isPublic && Boolean(user));
  const incidents = useIncidents({ page_size: 5 }, !isPublic && Boolean(user));

  if (isPublic) {
    return <>{children}</>;
  }

  const organizations = org.data
    ? [{ id: org.data.id, name: org.data.name, sector: org.data.industry ?? "—" }]
    : [];

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <DemoControlBar />
        <TopNavigation
          onMenu={() => setSidebarOpen(true)}
          organizations={organizations}
          organizationId={org.data?.id ?? ""}
          onOrganizationChange={() => undefined}
          notifications={(incidents.data?.data ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            detail: `${item.severity} · ${item.status}`,
            at: item.detected_at ?? item.created_at,
            level: (item.severity === "medium" ? "medium" : item.severity) as "critical" | "high" | "medium" | "low",
          }))}
          user={{
            name: user?.full_name ?? "Analyst",
            role: user?.role?.replaceAll("_", " ") ?? "",
            email: user?.email ?? "",
          }}
          enterpriseRisk={dashboard.data?.enterprise_risk_score}
          onLogout={logout}
          onOpenCommand={() => setCommandOpen(true)}
        />
        <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

