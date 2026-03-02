import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Настройки Юкассы
const YOOKASSA_SHOP_ID = Deno.env.get('YOOKASSA_SHOP_ID') || '';
const YOOKASSA_SECRET_KEY = Deno.env.get('YOOKASSA_SECRET_KEY') || '';
const YOOKASSA_RETURN_URL = Deno.env.get('YOOKASSA_RETURN_URL') || 'https://cvr.name/profile';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequest {
  amount: number;
  description: string;
  caseId?: string;
  userId?: string;
  email?: string;
}

interface CreatePaymentResponse {
  id: string;
  confirmation_url: string;
  status: string;
}

serve(async (req) => {
  // Обработка CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...data } = await req.json();

    switch (action) {
      case 'create':
        return await createPayment(data as PaymentRequest);
      case 'check':
        return await checkPayment(data.paymentId);
      case 'webhook':
        return await handleWebhook(await req.json());
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Создание платежа
async function createPayment(data: PaymentRequest): Promise<Response> {
  const { amount, description, caseId, userId, email } = data;
  
  // Создаем платеж в Юкассе
  const paymentData = {
    amount: {
      value: amount.toFixed(2),
      currency: 'RUB',
    },
    confirmation: {
      type: 'redirect',
      return_url: YOOKASSA_RETURN_URL,
    },
    description: description.substring(0, 128),
    metadata: {
      caseId: caseId || '',
      userId: userId || '',
    },
    receipt: email ? {
      customer: {
        email: email,
      },
      items: [
        {
          description: description.substring(0, 128),
          quantity: '1',
          amount: {
            value: amount.toFixed(2),
            currency: 'RUB',
          },
          vat_code: '1', // НДС 20%
        },
      ],
    } : undefined,
  };

  // Подпись для Юкассы (Base64)
  const auth = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`);

  const response = await fetch('https://payment.yandex.net/api/v3/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Idempotence-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    },
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('YooKassa error:', errorText);
    throw new Error('Failed to create payment');
  }

  const payment: CreatePaymentResponse = await response.json();

  // Сохраняем платеж в БД
  await supabase.from('payments').insert({
    payment_id: payment.id,
    amount: amount,
    description: description,
    case_id: caseId,
    user_id: userId,
    status: payment.status,
    created_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation_url,
      status: payment.status,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Проверка статуса платежа
async function checkPayment(paymentId: string): Promise<Response> {
  const auth = btoa(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`);

  const response = await fetch(`https://payment.yandex.net/api/v3/payments/${paymentId}`, {
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to check payment');
  }

  const payment = await response.json();

  // Обновляем статус в БД
  await supabase
    .from('payments')
    .update({ status: payment.status, updated_at: new Date().toISOString() })
    .eq('payment_id', paymentId);

  return new Response(
    JSON.stringify({
      status: payment.status,
      paid: payment.paid,
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Обработка webhook от Юкассы
async function handleWebhook(data: any): Promise<Response> {
  const { event, object } = data;

  if (event === 'payment.succeeded') {
    const paymentId = object.id;
    const caseId = object.metadata?.caseId;
    const userId = object.metadata?.userId;

    // Обновляем статус платежа
    await supabase
      .from('payments')
      .update({ 
        status: 'succeeded', 
        paid: true,
        updated_at: new Date().toISOString() 
      })
      .eq('payment_id', paymentId);

    // Если это оплата за мониторинг дела - активируем подписку
    if (caseId && userId) {
      await supabase.from('user_subscriptions').upsert({
        user_id: userId,
        case_id: caseId,
        active: true,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 дней
      });
    }
  }

  return new Response(
    JSON.stringify({ received: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
