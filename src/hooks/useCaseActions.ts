import { useQueryClient } from '@tanstack/react-query';
import { cases, refreshCase } from '../lib/supabase';
import { normalizeParsedCase } from '../lib/caseNormalization';
import type { ParsedCase } from '../types';

interface AddCaseParams {
  userId: string;
  caseData: ParsedCase;
  comment?: string;
}

export function useCaseActions(userId?: string) {
  const queryClient = useQueryClient();

  const invalidateUserCases = async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: ['userCases', userId] });
  };

  const addCase = async ({ userId, caseData, comment }: AddCaseParams) => {
    const { data: createdCase, error } = await cases.createCase({
      user_id: userId,
      ...caseData,
      ...(comment !== undefined ? { comment } : {}),
    });

    if (error || !createdCase) {
      return { data: null, error };
    }

    const normalizedCase = normalizeParsedCase({
      ...caseData,
      id: createdCase.id,
      status: createdCase.status || caseData.status || 'active',
      events: caseData.events || [],
      appeals: caseData.appeals || [],
      comment: comment ?? caseData.comment,
      updated_at: createdCase.updated_at,
    } as ParsedCase);

    await invalidateUserCases();
    return { data: normalizedCase, error: null };
  };

  const updateComment = async (caseId: string, comment: string) => {
    const { error } = await cases.updateCaseComment(caseId, comment);
    if (!error) {
      await invalidateUserCases();
    }
    return { error };
  };

  const archiveCase = async (caseId: string) => {
    const result = await cases.archiveCase(caseId);
    if (!result.error) {
      await invalidateUserCases();
    }
    return result;
  };

  const deleteCase = async (caseId: string) => {
    const result = await cases.deleteCase(caseId);
    if (!result.error) {
      await invalidateUserCases();
    }
    return result;
  };

  const refreshUserCase = async (
    caseId: string,
    currentCase: ParsedCase,
    options?: { userId?: string }
  ) => {
    const result = await refreshCase(caseId, currentCase.link, options);

    if (result.error || !result.data) {
      return { ...result, normalizedCase: null };
    }

    const normalizedCase = normalizeParsedCase({
      ...currentCase,
      ...result.data,
      last_manual_refresh_at: (result.data as any).last_manual_refresh_at,
    } as ParsedCase);

    await invalidateUserCases();
    return { ...result, normalizedCase };
  };

  return {
    addCase,
    updateComment,
    archiveCase,
    deleteCase,
    refreshUserCase,
    invalidateUserCases,
  };
}
