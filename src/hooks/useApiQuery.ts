import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {supabase} from '../lib/supabase';
import type {ParsedCase} from '../types';

// Кеширование списка дел
export function useCases(courtId?: string, searchQuery?: string) {
  return useQuery({
    queryKey: ['cases', courtId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('cases')
        .select('*')
        .order('updated_at', {ascending: false})
        .limit(50);

      if (courtId) {
        query = query.eq('court_id', courtId);
      }

      if (searchQuery) {
        query = query.or(`number.ilike.%${searchQuery}%,plaintiff.ilike.%${searchQuery}%,defendant.ilike.%${searchQuery}%`);
      }

      const {data, error} = await query;
      if (error) throw error;
      return data as ParsedCase[];
    },
    staleTime: 1000 * 60 * 5, // 5 минут
  });
}

// Кеширование списка юристов
export function useLawyers(specialization?: string) {
  return useQuery({
    queryKey: ['lawyers', specialization],
    queryFn: async () => {
      let query = supabase
        .from('lawyers')
        .select('*')
        .eq('verified', true)
        .order('rating', {ascending: false})
        .limit(20);

      if (specialization) {
        query = query.eq('specialization', specialization);
      }

      const {data, error} = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 минут
  });
}

// Кеширование лидов
export function useLeads() {
  return useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('leads')
        .select('*')
        .order('created_at', {ascending: false})
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 2, // 2 минуты
  });
}

// Кеширование профиля пользователя
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const {data, error} = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 минут
    enabled: !!userId,
  });
}

// Мutation для обновления данных с инвалидацией кеша
export function useUpdateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({id, updates}: {id: string; updates: Record<string, unknown>}) => {
      const {data, error} = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leads']});
    },
  });
}

// Мutation для создания лида
export function useCreateLead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (lead: Record<string, unknown>) => {
      const {data, error} = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['leads']});
    },
  });
}

// Хук для ручного управления кешем
export function useInvalidateQueries() {
  const queryClient = useQueryClient();
  
  return {
    invalidateCases: () => queryClient.invalidateQueries({queryKey: ['cases']}),
    invalidateLawyers: () => queryClient.invalidateQueries({queryKey: ['lawyers']}),
    invalidateLeads: () => queryClient.invalidateQueries({queryKey: ['leads']}),
    invalidateUserProfile: (userId: string) => 
      queryClient.invalidateQueries({queryKey: ['userProfile', userId]}),
  };
}
