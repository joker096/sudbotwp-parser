import { useQuery } from '@tanstack/react-query';
import { cases } from '../lib/supabase';
import { normalizeParsedCases } from '../lib/caseNormalization';
import type { ParsedCase } from '../types';

export function useUserCases(userId?: string, options?: { includeDeleted?: boolean }) {
  const includeDeleted = options?.includeDeleted ?? false;

  return useQuery<ParsedCase[]>({
    queryKey: ['userCases', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await cases.getCasesByUser(userId);
      if (error) throw error;

      const normalizedCases = normalizeParsedCases((data || []) as ParsedCase[]);
      return includeDeleted
        ? normalizedCases
        : normalizedCases.filter((caseItem) => caseItem.status !== 'deleted');
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    enabled: !!userId,
  });
}
