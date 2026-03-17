#!/usr/bin/env node

/**
 * Скрипт для автоматического обновления всех дел в базе данных.
 * Запускается по расписанию (например, через cronjob) раз в день.
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Конфигурация
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FUNCTION_SECRET = process.env.FUNCTION_SECRET || 'default-secret';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Функция для логирования с timestamps
const log = (message, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data || '');
};

// Проверка доступности сайта суда
const checkUrlAvailability = async (url) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    log(`URL unavailable: ${url}`, error.message);
    return false;
  }
};

// Функция для парсинга дела через нашу существующую функцию
const parseCase = async (url) => {
  try {
    const parseUrl = `${SUPABASE_URL}/functions/v1/parse-case`;
    
    const response = await fetch(parseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
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
    log(`Error parsing case: ${url}`, error.message);
    return null;
  }
};

// Обновление одного дела
const refreshSingleCase = async (caseId, caseLink, userId) => {
  log(`Starting refresh for case: ${caseId}, URL: ${caseLink}`);

  try {
    // Проверка доступности сайта суда
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
    const updates = {
      number: parsedData.number || '',
      court: parsedData.court || '',
      status: parsedData.status || '',
      date: parsedData.date || '',
      category: parsedData.category || '',
      judge: parsedData.judge || '',
      plaintiff: parsedData.plaintiff || '',
      defendant: parsedData.defendant || '',
      link: caseLink,
      events: JSON.stringify(parsedData.events || []),
      appeals: JSON.stringify(parsedData.appeals || []),
      updated_at: new Date().toISOString(),
    };

    // Обновление в базе данных
    const { error } = await supabase
      .from('cases')
      .update(updates)
      .eq('id', caseId)
      .select()
      .single();

    if (error) {
      log(`Error updating case: ${caseId}`, error.message);
      return false;
    }

    log(`Case ${caseId} updated successfully`);
    return true;
  } catch (error) {
    log(`Error refreshing case: ${caseId}`, error.message);
    return false;
  }
};

// Основная функция для обновления всех дел
const runAutoRefresh = async () => {
  log('=== Starting automatic cases refresh ===');

  try {
    // Получаем список ВСЕХ дел для обновления (не только с auto_refresh_enabled)
    // Обновляем все дела, которые не обновлялись более 24 часов
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: casesToRefresh, error: fetchError } = await supabase
      .from('cases')
      .select('id, link, user_id')
      .neq('status', 'deleted')
      .lt('updated_at', yesterday)
      .limit(500);

    if (fetchError) {
      throw fetchError;
    }

    log(`Found ${casesToRefresh?.length || 0} cases to refresh`);

    if (!casesToRefresh || casesToRefresh.length === 0) {
      log('No cases need refresh');
      process.exit(0);
    }

    // Обновляем дела параллельно с ограничением на количество одновременных запросов
    const batchSize = 5;
    const successfulRefreshes = [];
    const failedRefreshes = [];

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

    log('=== Refresh completed ===');
    log(`Successful: ${successfulRefreshes.length}`);
    log(`Failed: ${failedRefreshes.length}`);
    
    if (failedRefreshes.length > 0) {
      log(`Failed cases: ${failedRefreshes.join(', ')}`);
    }

    // Сохраняем статистику
    const stats = {
      timestamp: new Date().toISOString(),
      total: casesToRefresh.length,
      successful: successfulRefreshes.length,
      failed: failedRefreshes.length,
      failedCases: failedRefreshes,
    };
    
    console.log('\n=== Refresh Statistics ===');
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    log('Error during auto refresh process', error.message);
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
};

// Запускаем скрипт
if (require.main === module) {
  runAutoRefresh().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runAutoRefresh };
