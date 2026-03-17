import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.24.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

// Получить текущий месяц в формате YYYY-MM
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Проверить и обновить счётчик сообщений
async function checkAndUpdateMessageLimit(
  supabaseAdmin: any,
  userId: string,
  isSubscribed: boolean
): Promise<{ allowed: boolean; remaining: number; reason?: string }> {
  const currentMonth = getCurrentMonth();

  // Подписчики (basic или premium) имеют безлимит
  if (isSubscribed) {
    return { allowed: true, remaining: -1 }; // -1 означает безлимит
  }

  // Для бесплатных пользователей - проверяем лимит 10 сообщений в месяц
  // Получаем текущее использование
  const { data: usage, error: usageError } = await supabaseAdmin
    .from('ai_lawyer_usage')
    .select('messages_count, current_month')
    .eq('user_id', userId)
    .single();

  if (usageError && usageError.code !== 'PGRST116') {
    console.error('Error fetching usage:', usageError);
    return { allowed: false, remaining: 0, reason: 'Ошибка при проверке лимита' };
  }

  const messagesCount = usage?.messages_count || 0;
  const savedMonth = usage?.current_month;

  // Если новый месяц - сбрасываем счётчик
  if (savedMonth !== currentMonth) {
    // Создаём новую запись для нового месяца
    if (usage) {
      await supabaseAdmin
        .from('ai_lawyer_usage')
        .update({
          messages_count: 1,
          current_month: currentMonth,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } else {
      await supabaseAdmin
        .from('ai_lawyer_usage')
        .insert({
          user_id: userId,
          messages_count: 1,
          current_month: currentMonth,
        });
    }
    return { allowed: true, remaining: 9 };
  }

  // Проверяем лимит 10 сообщений
  if (messagesCount >= 10) {
    return {
      allowed: false,
      remaining: 0,
      reason: 'Лимит сообщений исчерпан. Доступно 10 сообщений в месяц для бесплатных пользователей. Оформите подписку для безлимитного доступа.'
    };
  }

  // Увеличиваем счётчик
  await supabaseAdmin
    .from('ai_lawyer_usage')
    .update({
      messages_count: messagesCount + 1,
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return { allowed: true, remaining: 10 - messagesCount - 1 };
}

// Сохранить сообщение в БД
async function saveMessage(
  supabaseAdmin: any,
  userId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { error } = await supabaseAdmin
    .from('ai_lawyer_messages')
    .insert({
      user_id: userId,
      role,
      content,
    });

  if (error) {
    console.error('Error saving message:', error);
  }
}

// Получить историю сообщений пользователя
async function getMessageHistory(
  supabaseAdmin: any,
  userId: string,
  limit: number = 10
): Promise<ChatMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('ai_lawyer_messages')
    .select('role, content')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching history:', error);
    return [];
  }

  return (data || []).map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    content: msg.content,
  }));
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get API keys from environment
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid authorization token');
    }

    // Проверяем подписку пользователя
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const subscriptionTier = profile?.subscription_tier || 'free';
    const isSubscribed = subscriptionTier === 'basic' || subscriptionTier === 'premium';

    // Проверяем и обновляем лимит сообщений
    const limitCheck = await checkAndUpdateMessageLimit(supabaseAdmin, user.id, isSubscribed);

    if (!limitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: limitCheck.reason,
          code: 'MESSAGE_LIMIT_EXCEEDED',
          remaining: limitCheck.remaining,
          isSubscribed,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403,
        }
      );
    }

    // Parse request body
    const { message, context, history } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Сохраняем сообщение пользователя
    await saveMessage(supabaseAdmin, user.id, 'user', message);

    // Initialize Google GenAI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    // Build conversation history
    const systemInstruction = context || `Ты - опытный юрист с 20-летним стажем работы в российских судах. 
Специализация: гражданское право, арбитраж, административные дела.
Помогаешь составлять иски, возражения, жалобы, ходатайства.
Всегда ссылаешься на статьи законов РФ (ГК РФ, ГПК РФ, АПК РФ).
Предупреждаешь о рисках. Не даёшь гарантий выигрыша.`;

    // Create the model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
    });

    // Combine database history with request history
    const dbHistory = await getMessageHistory(supabaseAdmin, user.id, 10);
    const requestHistory = (history || []).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      content: msg.content,
    }));

    // Use database history as primary, add request history for context
    const allHistory = [...dbHistory, ...requestHistory];

    // Filter chat history: remove model messages at the beginning,
    // Google GenerativeAI requires first message to be from 'user'
    const chatHistory: ChatMessage[] = [];
    for (const msg of allHistory) {
      if (msg.role === 'user') {
        chatHistory.push(msg);
      } else if (chatHistory.length > 0) {
        chatHistory.push(msg);
      }
    }

    // Start chat
    const chat = model.startChat({
      history: chatHistory,
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    // Send message
    const result = await chat.sendMessage(message);
    const response = result.response.text();

    // Сохраняем ответ ассистента
    await saveMessage(supabaseAdmin, user.id, 'assistant', response);

    return new Response(
      JSON.stringify({
        response,
        remaining: limitCheck.remaining,
        isSubscribed,
        subscriptionTier,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('AI Lawyer error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
