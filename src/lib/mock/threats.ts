import type { Threat } from "@/lib/types";

export const threatProbeTrend = [
  { day: "07 Sep", probes: 118 },
  { day: "08 Sep", probes: 132 },
  { day: "09 Sep", probes: 141 },
  { day: "10 Sep", probes: 126 },
  { day: "11 Sep", probes: 154 },
  { day: "12 Sep", probes: 167 },
];

export const threats: Threat[] = [
  {
    id: "thr-1",
    name: "Credential stuffing against VPN portals",
    category: "active",
    actor: "Unattributed crimeware",
    mitreTechniques: ["T1110", "T1078", "T1133"],
    affectedAssets: 6,
    trend: {
      direction: "up",
      delta: 12,
      label: "+12% probes / 7d",
      sentiment: "negative",
    },
    summary:
      "Elevated authentication failures on the internet-facing VPN, consistent with commodity credential stuffing.",
  },
  {
    id: "thr-2",
    name: "Ransomware affiliate reconnaissance",
    category: "emerging",
    actor: "LockBit-style affiliate (unconfirmed)",
    mitreTechniques: ["T1046", "T1486", "T1490"],
    affectedAssets: 3,
    trend: {
      direction: "up",
      delta: 4,
      label: "New chatter",
      sentiment: "negative",
    },
    summary:
      "Public reporting of similar-sector targeting. No confirmed foothold in this illustrative dataset.",
  },
  {
    id: "thr-3",
    name: "Cloud storage misconfiguration scanning",
    category: "active",
    mitreTechniques: ["T1530", "T1580"],
    affectedAssets: 9,
    trend: {
      direction: "flat",
      delta: 0,
      label: "Stable",
      sentiment: "neutral",
    },
    summary:
      "Internet-wide scanners probing object-storage endpoints. Current bucket policies are the control of record.",
  },
  {
    id: "thr-4",
    name: "Business-email compromise toolkit refresh",
    category: "emerging",
    actor: "Scattered Spider-like TTPs",
    mitreTechniques: ["T1566", "T1078.004"],
    affectedAssets: 14,
    trend: {
      direction: "down",
      delta: 6,
      label: "-6% after awareness",
      sentiment: "positive",
    },
    summary:
      "Helpdesk impersonation playbooks circulating. MFA coverage gaps remain the primary enabler.",
  },
];
