import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

// Конфигурация
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Функция для логирования
const log = (message: string, data?: any) => {
  console.log(`[${new Date().toISOString()}] ${message}`, data || "");
};

// Проверка доступности сайта
const checkUrlAvailability = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    log(`URL unavailable: ${url}`, error);
    return false;
  }
};

// Функция для парсинга дела
const parseCase = async (url: string): Promise<any> => {
  try {
    // Используем внутреннюю parse-case функцию
    const parseUrl = `${SUPABASE_URL}/functions/v1/parse-case`;
    
    const response = await fetch(parseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(180000), // 3 минуты
    });

    if (!response.ok) {
      log(`Parse case failed with status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    log(`Error parsing case: ${url}`, error);
    return null;
  }
};

// Обновление одного дела
const refreshSingleCase = async (caseId: string, caseLink: string, userId: string): Promise<boolean> => {
  log(`Starting refresh for case: ${caseId}, URL: ${caseLink}`);

  try {
    // Проверка доступности сайта
    if (!(await checkUrlAvailability(caseLink))) {
      log(`Court website unavailable for case: ${caseId}`);
      return false;
    }

    // Парсинг данных
    const parsedData = await parseCase(caseLink);
    if (!parsedData) {
      log(`Failed to parse case: ${caseId}`);
      return false;
    }

    // Подготовка обновляемых полей
    const updates: any = {
      number: parsedData.number || "",
      court: parsedData.court || "",
      status: parsedData.status || "",
      date: parsedData.date || "",
      category: parsedData.category || "",
      judge: parsedData.judge || "",
      plaintiff: parsedData.plaintiff || "",
      defendant: parsedData.defendant || "",
      link: caseLink,
      events: JSON.stringify(parsedData.events || []),
      appeals: JSON.stringify(parsedData.appeals || []),
      updated_at: new Date().toISOString(),
    };

    // Обновление в базе данных
    const { error } = await supabase
      .from("cases")
      .update(updates)
      .eq("id", caseId)
      .select()
      .single();

    if (error) {
      log(`Error updating case: ${caseId}`, error);
      return false;
    }

    log(`Case ${caseId} updated successfully`);
    return true;
  } catch (error) {
    log(`Error refreshing case: ${caseId}`, error);
    return false;
  }
};

// Основная функция автоматического обновления
const autoRefreshCases = async () => {
  log("=== Starting automatic cases refresh ===");

  try {
    // Получаем список ВСЕХ дел для обновления (не только с auto_refresh_enabled)
    // Обновляем все дела, которые не обновлялись более 24 часов
    const { data: casesToRefresh, error: fetchError } = await supabase
      .from("cases")
      .select("id, link, user_id")
      .neq("status", "deleted")
      .lt("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(500); // Увеличили лимит до 500 дел за один запуск

    if (fetchError) {
      throw fetchError;
    }

    log(`Found ${casesToRefresh?.length || 0} cases to refresh`);

    if (!casesToRefresh || casesToRefresh.length === 0) {
      log("No cases need refresh");
      return;
    }

    // Обновляем дела параллельно с ограничением на количество одновременных запросов
    const batchSize = 5;
    const successfulRefreshes: string[] = [];
    const failedRefreshes: string[] = [];

    for (let i = 0; i < casesToRefresh.length; i += batchSize) {
      const batch = casesToRefresh.slice(i, i + batchSize);

      log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(casesToRefresh.length / batchSize)}`);

      const promises = batch.map(async (caseItem) => {
        const success = await refreshSingleCase(caseItem.id, caseItem.link, caseItem.user_id);
        return { id: caseItem.id, success };
      });

      const results = await Promise.all(promises);

      results.forEach((result) => {
        if (result.success) {
          successfulRefreshes.push(result.id);
        } else {
          failedRefreshes.push(result.id);
        }
      });

      // Задержка между батчами, чтобы не перегружать сервер
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    log(`=== Refresh completed ===`);
    log(`Successful: ${successfulRefreshes.length}`);
    log(`Failed: ${failedRefreshes.length}`);
    
    if (failedRefreshes.length > 0) {
      log(`Failed cases: ${failedRefreshes.join(", ")}`);
    }
  } catch (error) {
    log("Error during auto refresh process", error);
  }
};

// HTTP handler для запуска функции
const handler = async (req: Request): Promise<Response> => {
  // Проверка авторизации - только внутренние запросы
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("FUNCTION_SECRET")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Запускаем обновление в фоновом режиме
  autoRefreshCases().catch((error) => {
    console.error("Background refresh failed:", error);
  });

  return new Response(
    JSON.stringify({
      status: "success",
      message: "Automatic refresh started",
      timestamp: new Date().toISOString(),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );
};

// Запуск сервера
log("Auto-refresh function initialized");
serve(handler);
