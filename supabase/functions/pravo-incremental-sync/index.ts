/**
 * Edge Function для инкрементальной синхронизации документов с pravo.gov.ru
 * Загружает только новые документы за последний месяц
 * 
 * Настройка cron:
 * - Через Supabase Dashboard > Edge Functions > pravo-incremental-sync
 * - Или через внешний cron (cron-job.org, easycron и т.д.)
 * - URL функции: https://qhiietjvfuekfaehddox.supabase.co/functions/v1/pravo-incremental-sync
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRAVO_API = "http://publication.pravo.gov.ru/api";

// Блоки для мониторинга
const BLOCKS = [
  { code: 'laws', name: 'Федеральные законы' },
  { code: 'decrees', name: 'Указы Президента' },
  { code: 'govacts', name: 'Акты Правительства' },
  { code: 'fedorgs', name: 'Акты федеральных органов' },
  { code: 'region', name: 'Региональные документы' },
];

/**
 * Извлекает дату из ID документа
 */
function extractDateFromId(id: string): { year: number; month: number; day: number } | null {
  if (!id || id.length < 12) return null;
  
  // Федеральный формат: XXXXXXXXXYYYYMMDDNNNN
  if (id.length >= 17) {
    const year = parseInt(id.substring(9, 13));
    const month = parseInt(id.substring(13, 15));
    const day = parseInt(id.substring(15, 17));
    
    if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  
  // Региональный формат
  if (id.length >= 12) {
    const dateStr = id.slice(-8, -4);
    const day = parseInt(dateStr.slice(0, 2));
    const month = parseInt(dateStr.slice(2, 4));
    
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const yearStr = id.slice(-4, -2);
      const year = 2000 + parseInt(yearStr);
      if (year >= 2020 && year <= 2100) {
        return { year, month, day };
      }
    }
  }
  
  return null;
}

/**
 * Проверяет, является ли документ новым (за последние N дней)
 */
function isNewDoc(id: string, daysBack: number = 30): boolean {
  const docDate = extractDateFromId(id);
  if (!docDate) return false;
  
  const now = new Date();
  const pastDate = new Date(now);
  pastDate.setDate(pastDate.getDate() - daysBack);
  
  const docDateObj = new Date(docDate.year, docDate.month - 1, docDate.day);
  return docDateObj >= pastDate;
}

/**
 * Загружает документы для блока
 */
async function fetchBlockDocuments(blockCode: string, daysBack: number = 30): Promise<any[]> {
  const documents: any[] = [];
  const pageSize = 100;
  let page = 1;
  let hasMore = true;
  let maxPages = 20; // Ограничение для одного запуска Edge Function
  
  console.log(`Fetching block: ${blockCode}`);
  
  while (hasMore && page <= maxPages) {
    try {
      const url = `${PRAVO_API}/Documents?Block=${blockCode}&PeriodType=monthly&page=${page}&pageSize=${pageSize}`;
      
      const res = await fetch(url, { 
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000)
      });
      
      if (!res.ok) {
        console.log(`Error: ${res.status}`);
        hasMore = false;
        break;
      }
      
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.items || [];
      
      if (items.length === 0) {
        hasMore = false;
        break;
      }
      
      // Обрабатываем документы
      for (const doc of items) {
        const docId = doc.eoNumber || doc.id;
        
        // Проверяем, новый ли документ
        if (!isNewDoc(docId, daysBack)) {
          hasMore = false; // Документы отсортированы по дате, дальше старые
          break;
        }
        
        const docUrl = doc.url || `http://publication.pravo.gov.ru/Document/View/${docId}`;
        const docName = doc.complexName || doc.name || '';
        
        if (docId && docName) {
          documents.push({
            i: docId,
            u: docUrl,
            a: doc.authority || doc.signatory || blockCode
          });
        }
      }
      
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
      
      // Задержка между запросами
      await new Promise(r => setTimeout(r, 300));
      
    } catch (e) {
      console.log(`Error fetching ${blockCode}: ${e.message}`);
      hasMore = false;
    }
  }
  
  console.log(`Found ${documents.length} new documents for ${blockCode}`);
  return documents;
}

serve(async (req: Request): Promise<Response> => {
  // Разрешаем только POST и GET
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseUrl, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: { Authorization: `Bearer ${supabaseKey}` }
    }
  });

  try {
    console.log("Starting incremental pravo.gov.ru sync...");
    
    const startTime = Date.now();
    let totalNewDocs = 0;
    
    // Проверяем доступность API
    let apiWorks = false;
    try {
      const test = await fetch(`${PRAVO_API}/PublicBlocks?page=1&pageSize=5`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      if (test.ok) {
        apiWorks = true;
        console.log("API is available");
      }
    } catch (e) {
      console.log("API not available:", e.message);
    }
    
    if (!apiWorks) {
      return new Response(JSON.stringify({
        success: false,
        message: "API pravo.gov.ru not available",
        newDocuments: 0,
      }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Загружаем новые документы для каждого блока
    for (const block of BLOCKS) {
      try {
        const newDocs = await fetchBlockDocuments(block.code, 30);
        
        if (newDocs.length > 0) {
          // Сохраняем в Supabase
          const docsToSave = newDocs.map(doc => ({
            id: doc.i,
            name: doc.u,
            type: block.name,
            url: doc.u,
            block_code: block.code,
            synced_at: new Date().toISOString()
          }));
          
          // UPSERT в Supabase (игнорируем дубликаты)
          const { error } = await supabase
            .from('pravo_documents')
            .upsert(docsToSave, { onConflict: 'id', ignoreDuplicates: true });
          
          if (error) {
            console.log(`Error saving ${block.code}:`, error.message);
          } else {
            totalNewDocs += newDocs.length;
            console.log(`Saved ${newDocs.length} documents for ${block.code}`);
          }
        }
      } catch (e) {
        console.log(`Error processing block ${block.code}:`, e.message);
      }
    }
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`Sync completed: ${totalNewDocs} new documents in ${elapsed}s`);
    
    return new Response(JSON.stringify({
      success: true,
      newDocuments: totalNewDocs,
      elapsedSeconds: parseFloat(elapsed),
      message: totalNewDocs > 0 
        ? `Добавлено ${totalNewDocs} новых документов`
        : 'Новых документов не найдено'
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
