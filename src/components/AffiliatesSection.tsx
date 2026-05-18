import { Users, Building2, User } from 'lucide-react';
import type { AffiliateGraph } from '../lib/affiliates';

interface AffiliatesSectionProps {
  graph: AffiliateGraph;
}

export default function AffiliatesSection({ graph }: AffiliatesSectionProps) {
  const centerNode = graph.nodes.find((n) => n.type === 'company');
  const founders = graph.nodes.filter((n) => n.type === 'person');

  return (
    <div className="space-y-4">
      {/* Центральная компания */}
      {centerNode && (
        <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-xl">
          <Building2 className="w-6 h-6 text-accent" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{centerNode.name}</p>
            <p className="text-xs text-slate-500">ИНН: {centerNode.inn}</p>
          </div>
        </div>
      )}

      {/* Учредители */}
      <div>
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Учредители ({founders.length})
        </h4>
        <div className="space-y-2">
          {founders.map((founder) => {
            const link = graph.links.find(
              (l) => l.target === founder.id || l.source === founder.id
            );
            return (
              <div
                key={founder.id}
                className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {founder.name}
                    </p>
                    {founder.inn && (
                      <p className="text-xs text-slate-500">ИНН: {founder.inn}</p>
                    )}
                  </div>
                </div>
                {link?.label && (
                  <span className="text-xs font-bold text-accent bg-accent/10 px-2 py-1 rounded-full">
                    {link.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {founders.length === 0 && (
        <div className="text-center py-8 text-slate-400 dark:text-slate-500">
          <p className="text-sm">Учредители не найдены в выписке ЕГРЮЛ</p>
        </div>
      )}
    </div>
  );
}
