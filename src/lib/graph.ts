import type { AttackPath as GraphPath, AttackPathNode, AssetType } from "@/lib/types";
import type { AttackPath, Risk } from "@/lib/types/api";
import { num, toUiRiskLevel } from "@/lib/level";

const kindMap: Record<string, AssetType | "entry"> = {
  entry: "entry",
  internet: "entry",
  network_device: "network",
  identity: "identity",
  application: "application",
  database: "database",
  service: "application",
  business_service: "application",
  server: "cloud",
  asset: "network",
  network: "network",
  cloud_resource: "cloud",
  endpoint: "endpoint",
};

const exposureMap: Record<string, AssetType | "entry"> = {
  internet: "entry",
  external: "entry",
  public: "entry",
};

function classifyNode(
  kind: string | undefined,
  exposure: string | undefined,
  name: string,
): AssetType | "entry" {
  const lowerKind = (kind ?? "").toLowerCase();
  if (exposureMap[(exposure ?? "").toLowerCase()]) {
    return "entry";
  }
  if (kindMap[lowerKind]) return kindMap[lowerKind];
  const lowerName = name.toLowerCase();
  if (/(vpn|gateway|remote|internet|public|external)/.test(lowerName)) return "entry";
  if (/(identity|idp|auth|sso|ldap|ad|active.?directory)/.test(lowerName)) return "identity";
  if (/(database|db |postgres|mysql|mongo|sql|oracle)/.test(lowerName)) return "database";
  if (/(application|app |api|service|svc|portal|payment|customer)/.test(lowerName)) return "application";
  if (/(backup|snapshot|disaster|dr )/.test(lowerName)) return "cloud";
  if (/(server|host|vm |compute)/.test(lowerName)) return "cloud";
  return "network";
}

export function toGraphPath(path: AttackPath, risks: Risk[]): GraphPath {
  const byAsset = new Map(risks.filter((item) => item.asset_id).map((item) => [item.asset_id as string, item]));
  const idMap = new Map<string, string>();

  const rawNodes = path.nodes ?? [];
  const nodes: AttackPathNode[] = rawNodes.map((node, index) => {
    const primaryId = node.id || node.postgres_id || `node-${index}`;
    if (node.id) idMap.set(node.id, primaryId);
    if (node.postgres_id) idMap.set(node.postgres_id, primaryId);

    const pid = node.postgres_id ?? node.id ?? primaryId;
    const risk = byAsset.get(pid);
    const residualRisk = risk?.residual_risk ?? (node.criticality ?? 3) * 20;
    const level = toUiRiskLevel(residualRisk);
    const nodeType = classifyNode(node.kind, node.exposure ?? "", node.label);
    return {
      id: primaryId,
      label: node.label,
      type: nodeType,
      level,
      controls: [],
      businessService:
        path.affected_business_services?.[0] ??
        (/service|database|payment|customer/i.test(node.label) ? node.label : node.label),
      probability: Math.min(1, (node.criticality ?? 3) / 5),
      impactInr: num(risk?.financial_exposure ?? node.financial_exposure ?? node.business_value ?? 0),
    };
  });

  const nodeIds = new Set(nodes.map((n) => n.id));

  let edges = (path.edges ?? [])
    .map((edge, index) => {
      const source = idMap.get(edge.source) ?? edge.source;
      const target = idMap.get(edge.target) ?? edge.target;
      return {
        id: `${source}-${target}-${index}`,
        source,
        target,
        technique: edge.relation ?? "CONNECTS_TO",
      };
    })
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target));

  if (edges.length === 0 && nodes.length >= 2) {
    edges = nodes.slice(0, -1).map((node, i) => ({
      id: `fallback-edge-${i}`,
      source: node.id,
      target: nodes[i + 1].id,
      technique: i === 0 ? "ENTRY_ACCESS" : "LATERAL_MOVEMENT",
    }));
  }

  return {
    id: path.id,
    name: path.name,
    riskScore: path.risk_score,
    potentialExposureInr: num(path.financial_exposure),
    criticalWeakness: path.critical_weakness ?? "No individual weakness flagged; path risk is aggregate.",
    recommendedAction:
      path.recommended_action ?? "Apply compensating controls along the path and re-score.",
    probability: Math.min(1, path.risk_score / 100),
    businessImpact:
      (path.affected_business_services ?? []).join(", ") ||
      path.critical_weakness ||
      path.target_label ||
      path.name,
    nodes,
    edges,
    illustrative: true,
  };
}
