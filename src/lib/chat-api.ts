import { supabase } from "./supabase";

export const chats = {
  // Создать новый чат
  create: async (userId: string, lawyerId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        lawyer_id: lawyerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },

  // Получить чат между пользователем и юристом
  getByUserAndLawyer: async (userId: string, lawyerId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .eq('lawyer_id', lawyerId)
      .single();
    return { data, error };
  },

  // Получить чаты пользователя
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('last_message_at', { ascending: false });
    return { data, error };
  },

  // Получить чаты юриста
  getByLawyer: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('last_message_at', { ascending: false });
    return { data, error };
  },

  // Отправить сообщение
  sendMessage: async (chatId: string, senderId: string, senderType: 'user' | 'lawyer', content: string, messageType = 'text') => {
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        chat_id: chatId,
        sender_id: senderId,
        sender_type: senderType,
        content: content,
        message_type: messageType,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (messageError) return { data: null, error: messageError };

    // Обновляем последнее сообщение в чате
    const { error: updateError } = await supabase
      .from('chats')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: content.substring(0, 100),
        updated_at: new Date().toISOString(),
        unread_user_count: senderType === 'lawyer' ? 1 : 0,
        unread_lawyer_count: senderType === 'user' ? 1 : 0,
      })
      .eq('id', chatId);

    return { data: messageData, error: updateError };
  },

  // Получить сообщения чата
  getMessages: async (chatId: string, limit = 50, offset = 0) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    return { data, error };
  },

  // Отметить сообщения как прочитанные
  markAsRead: async (chatId: string, userId: string, isLawyer: boolean) => {
    const updateField = isLawyer ? 'unread_lawyer_count' : 'unread_user_count';
    const { error } = await supabase
      .from('chats')
      .update({ [updateField]: 0 })
      .eq('id', chatId);
    return { error };
  },

  // Получить непрочитанные сообщения
  getUnreadCount: async (chatId: string, isLawyer: boolean) => {
    const { data, error } = await supabase
      .from('chats')
      .select(isLawyer ? 'unread_lawyer_count' : 'unread_user_count')
      .eq('id', chatId)
      .single();
    return { data, error };
  },

  // Закрыть чат
  close: async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', chatId);
    return { error };
  },

  // Удалить чат
  delete: async (chatId: string) => {
    const { error } = await supabase
      .from('chats')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('id', chatId);
    return { error };
  },
};

export const safeDeals = {
  // Создать безопасную сделку
  create: async (dealData: {
    chat_id: string;
    user_id: string;
    lawyer_id: string;
    service_type: string;
    service_description?: string;
    amount: number;
    deadline_days?: number;
  }) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .insert({
        chat_id: dealData.chat_id,
        user_id: dealData.user_id,
        lawyer_id: dealData.lawyer_id,
        service_type: dealData.service_type,
        service_description: dealData.service_description || null,
        amount: dealData.amount,
        deadline_days: dealData.deadline_days || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    return { data, error };
  },

  // Получить сделку по ID
  getById: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .select('*')
      .eq('id', dealId)
      .single();
    return { data, error };
  },

  // Получить сделки по чату
  getByChat: async (chatId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить сделки пользователя
  getByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить сделки юриста
  getByLawyer: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Подтвердить сделку пользователем
  confirmByUser: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        user_confirmed: true,
        user_confirmed_at: new Date().toISOString(),
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },

  // Подтвердить сделку юристом
  confirmByLawyer: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        lawyer_confirmed: true,
        lawyer_confirmed_at: new Date().toISOString(),
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },

  // Отметить сделку как оплаченную
  markAsPaid: async (dealId: string, paymentId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        paid_at: new Date().toISOString(),
        escrow_payment_id: paymentId,
        status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },

  // Завершить сделку
  complete: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },

  // Открыть спор
  openDispute: async (dealId: string, userId: string, lawyerId: string, reason: string, description?: string) => {
    const { data, error } = await supabase
      .from('deal_disputes')
      .insert({
        deal_id: dealId,
        user_id: userId,
        lawyer_id: lawyerId,
        dispute_reason: reason,
        dispute_description: description || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) return { data: null, error };
    
    // Обновляем статус сделки
    const { error: updateError } = await supabase
      .from('safe_deals')
      .update({ status: 'disputed', disputed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', dealId);
    
    return { data, error: updateError };
  },

  // Получить споры по сделке
  getDisputesByDeal: async (dealId: string) => {
    const { data, error } = await supabase
      .from('deal_disputes')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить споры пользователя
  getDisputesByUser: async (userId: string) => {
    const { data, error } = await supabase
      .from('deal_disputes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Получить споры юриста
  getDisputesByLawyer: async (lawyerId: string) => {
    const { data, error } = await supabase
      .from('deal_disputes')
      .select('*')
      .eq('lawyer_id', lawyerId)
      .order('created_at', { ascending: false });
    return { data, error };
  },

  // Арбитражное решение
  arbitratorDecision: async (disputeId: string, arbitratorId: string, decision: string) => {
    const { data, error } = await supabase
      .from('deal_disputes')
      .update({
        arbitrator_id: arbitratorId,
        arbitrator_decision: decision,
        arbitrator_decision_at: new Date().toISOString(),
        dispute_status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', disputeId)
      .select()
      .single();
    return { data, error };
  },

  // Возврат средств
  refund: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        refunded_at: new Date().toISOString(),
        status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },

  // Отменить сделку
  cancel: async (dealId: string) => {
    const { data, error } = await supabase
      .from('safe_deals')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select()
      .single();
    return { data, error };
  },
};

export const chatMessages = {
  // Получить количество сообщений в чате
  getCount: async (chatId: string) => {
    const { count, error } = await supabase
      .from('chat_messages')
      .select('id', { count: 'exact' })
      .eq('chat_id', chatId);
    return { count: count || 0, error };
  },

  // Получить последние сообщения
  getRecent: async (chatId: string, limit = 10) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  // Поиск сообщений
  search: async (chatId: string, query: string) => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('chat_id', chatId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false });
    return { data, error };
  },
};