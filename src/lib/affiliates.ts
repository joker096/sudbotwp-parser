/**
 * Работа с аффилированностью (связи компаний через учредителей)
 */

import type { EgrulData } from './counterparty';

export interface FounderInfo {
  name: string;
  inn?: string;
  share?: string;
}

export interface AffiliateGraph {
  nodes: Array<{ id: string; name: string; type: 'company' | 'person'; inn?: string }>;
  links: Array<{ source: string; target: string; label?: string }>;
}

export function parseFounders(egrulData: EgrulData): FounderInfo[] {
  const raw = (egrulData as any).raw;
  const founders = raw?.founders || raw?.учредители || [];

  return founders.map((f: any) => ({
    name: f.name || f.наименование || f.fullName,
    inn: f.inn || f.инн,
    share: f.share || f.доля || f.percent,
  }));
}

export function buildAffiliateGraph(inn: string, egrulData: EgrulData): AffiliateGraph {
  const nodes: AffiliateGraph['nodes'] = [];
  const links: AffiliateGraph['links'] = [];

  const centerNode = {
    id: inn,
    name: egrulData.name || egrulData.fullName,
    type: 'company' as const,
    inn,
  };
  nodes.push(centerNode);

  const founders = parseFounders(egrulData);

  for (const founder of founders) {
    const founderId = founder.inn || `founder-${founder.name}`;
    nodes.push({ id: founderId, name: founder.name, type: 'person', inn: founder.inn });
    links.push({ source: centerNode.id, target: founderId, label: founder.share });
  }

  return { nodes, links };
}
