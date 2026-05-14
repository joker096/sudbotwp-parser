/**
 * Модуль для работы с API портала "Официальное опубликование правовых актов"
 * http://publication.pravo.gov.ru
 * 
 * Теперь использует данные из Supabase ( localStorage fallback)
 */

import { supabase } from './supabase';

/**
 * Типы данных для API
 */

/** Блок публикации */
export interface PublicBlock {
  code: string;
  name: string;
  type: string;
  url?: string;
  childs?: PublicBlock[];
}

/** Подблок */
export interface SubBlock {
  code: string;
  name: string;
  type: string;
  url?: string;
  document?: DocumentInfo;
}

/** Информация о документе */
export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  date: string;
  number?: string;
  signDate?: string;
  publishedDate?: string;
  url: string;
  htmlUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
}

/** Результат поиска документов */
export interface SearchResult {
  items: DocumentInfo[];
  totalCount: number;
  page: number;
  pageSize: number;
}


/**
 * Получение списка блоков публикации
 */
export async function getPublicBlocks(): Promise<PublicBlock[]> {
  try {
    const { data, error } = await supabase
      .from('pravo_blocks')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Database error, using localStorage:', error);
    return getLocalBlocks();
  }
}

/**
 * Получение подблоков по коду родительского блока
 */
export async function getSubBlocks(parentCode: string): Promise<SubBlock[]> {
  try {
    const { data, error } = await supabase
      .from('pravo_blocks')
      .select('*')
      .eq('parent_code', parentCode)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.warn('Database error:', error);
    return [];
  }
}

/**
 * Получение списка документов по коду блока
 */
export async function getDocumentsByBlock(
  blockCode: string, 
  page: number = 1, 
  pageSize: number = 20
): Promise<SearchResult> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await supabase
      .from('pravo_documents')
      .select('*', { count: 'exact' })
      .eq('block_code', blockCode)
      .order('date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return {
      items: data || [],
      totalCount: count || 0,
      page,
      pageSize
    };
  } catch (error) {
    console.warn('Database error, using localStorage:', error);
    return getLocalDocuments(blockCode, page, pageSize);
  }
}

/**
 * Получение документа по ID
 */
export async function getDocumentById(documentId: string): Promise<DocumentInfo | null> {
  try {
    const { data, error } = await supabase
      .from('pravo_documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('Database error:', error);
    return null;
  }
}

/**
 * Поиск документов по тексту
 */
export async function searchDocuments(
  query: string, 
  page: number = 1, 
  pageSize: number = 20
): Promise<SearchResult> {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await supabase
      .from('pravo_documents')
      .select('*', { count: 'exact' })
      .ilike('name', `%${query}%`)
      .order('date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    
    return {
      items: data || [],
      totalCount: count || 0,
      page,
      pageSize
    };
  } catch (error) {
    console.warn('Database error, using localStorage:', error);
    return searchLocalDocuments(query, page, pageSize);
  }
}

/**
 * Получение списка подблоков по коду
 */
export async function getSubBlockByCode(code: string): Promise<SubBlock[]> {
  try {
    const { data, error } = await supabase
      .from('pravo_blocks')
      .select('*')
      .eq('code', code)
      .single();
    
    if (error) throw error;
    return data ? [data] : [];
  } catch (error) {
    console.warn('Database error:', error);
    return [];
  }
}

/**
 * Вспомогательная функция для определения типа блока
 */
function getBlockType(blockCode: string): string {
  const types: Record<string, string> = {
    'laws': 'федеральный закон',
    'decrees': 'указ',
    'govacts': 'постановление',
    'fedorgs': 'приказ',
  };
  return types[blockCode] || '';
}

/**
 * Основные коды блоков для常用ных категорий документов
 */
export const BLOCK_CODES = {
  FEDERAL_LAWS: 'laws',
  CONSTITUTION_LAWS: 'constlaws',
  PRESIDENT_DECREES: 'decrees',
  PRESIDENT_ORDERS: 'orders',
  GOVERNMENT_ACTS: 'govacts',
  FEDERAL_ORG_ACTS: 'fedorgs',
  REGIONAL_ACTS: 'regionals',
  ASSEMBLY: 'assembly',
  GOVERNMENT: 'government',
  PRESIDENT: 'president',
} as const;

/**
 * Кэш для хранения данных
 */
class PravoApiCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 15 * 60 * 1000;

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (item && Date.now() - item.timestamp < this.TTL) {
      return item.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const pravoCache = new PravoApiCache();

/**
 * LocalStorage fallback данные
 */
const LOCAL_BLOCKS_KEY = 'pravo_blocks';
const LOCAL_DOCS_KEY = 'pravo_documents';

/**
 * Демо-данные для fallback в localStorage
 */
const DEMO_BLOCKS: PublicBlock[] = [
  { code: 'laws', name: 'Федеральные законы', type: 'Федеральные законы РФ', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=102' },
  { code: 'decrees', name: 'Указы Президента', type: 'Указы и распоряжения Президента', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=104' },
  { code: 'govacts', name: 'Акты Правительства', type: 'Постановления и распоряжения Правительства', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=108' },
  { code: 'fedorgs', name: 'Акты федеральных органов', type: 'Приказы и письма ведомств', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=120' },
  { code: 'assembly', name: 'Совет Федерации', type: 'Документы Совета Федерации', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=101' },
  { code: 'government', name: 'Правительство РФ', type: 'Документы Правительства', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=103' },
  { code: 'conslaws', name: 'Конституционные законы', type: 'Конституционные законы РФ', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=107' },
  { code: 'regionals', name: 'Региональные акты', type: 'Законы субъектов РФ', url: 'http://publication.pravo.gov.ru/Documents?section=grfn&sub=200' },
];

export const DEMO_DOCUMENTS: DocumentInfo[] = [
  { id: '1', name: 'Федеральный закон от 21.11.2011 N 323-ФЗ "Об основах охраны здоровья граждан в Российской Федерации"', type: 'Федеральный закон', date: '2011-11-21', number: '323-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001201111210001' },
  { id: '2', name: 'Федеральный закон от 31.07.2020 N 248-ФЗ "О государственном контроле (надзоре) и муниципальном контроле в Российской Федерации"', type: 'Федеральный закон', date: '2020-07-31', number: '248-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001202007310001' },
  { id: '3', name: 'Федеральный закон от 27.07.2006 N 152-ФЗ "О персональных данных"', type: 'Федеральный закон', date: '2006-07-27', number: '152-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001200607270025' },
  { id: '4', name: 'Указ Президента РФ от 07.05.2018 N 204 "О национальных целях и стратегических задачах развития Российской Федерации на период до 2024 года"', type: 'Указ Президента', date: '2018-05-07', number: '204', url: 'http://publication.pravo.gov.ru/Document/View/0001201805070044' },
  { id: '5', name: 'Постановление Правительства РФ от 01.11.2021 N 1908 "Об утверждении перечня видов федеральных конституционных законов и федеральных законов"', type: 'Постановление Правительства', date: '2021-11-01', number: '1908', url: 'http://publication.pravo.gov.ru/Document/View/0001202111010001' },
  { id: '6', name: 'Федеральный закон от 13.07.2015 N 218-ФЗ "О государственной регистрации недвижимости"', type: 'Федеральный закон', date: '2015-07-13', number: '218-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001201507130017' },
  { id: '7', name: 'Федеральный закон от 29.12.2012 N 273-ФЗ "Об образовании в Российской Федерации"', type: 'Федеральный закон', date: '2012-12-29', number: '273-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001201212290043' },
  { id: '8', name: 'Федеральный закон от 26.10.2002 N 127-ФЗ "О несостоятельности (банкротстве)"', type: 'Федеральный закон', date: '2002-10-26', number: '127-ФЗ', url: 'http://publication.pravo.gov.ru/Document/View/0001200210260026' },
];

function getLocalBlocks(): PublicBlock[] {
  try {
    const stored = localStorage.getItem(LOCAL_BLOCKS_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {}
  return DEMO_BLOCKS;
}

function getLocalDocuments(blockCode: string, page: number, pageSize: number): SearchResult {
  try {
    const stored = localStorage.getItem(LOCAL_DOCS_KEY);
    const allDocs = stored ? JSON.parse(stored) : DEMO_DOCUMENTS;
    const filtered = allDocs.filter((d: DocumentInfo) => d.type.toLowerCase().includes(getBlockType(blockCode)));
    const items = filtered.length > 0 ? filtered : DEMO_DOCUMENTS;
    return { items, totalCount: items.length, page, pageSize };
  } catch (e) {
    return { items: DEMO_DOCUMENTS, totalCount: DEMO_DOCUMENTS.length, page, pageSize };
  }
}

function searchLocalDocuments(query: string, page: number, pageSize: number): SearchResult {
  try {
    const stored = localStorage.getItem(LOCAL_DOCS_KEY);
    const allDocs = stored ? JSON.parse(stored) : DEMO_DOCUMENTS;
    const lowerQuery = query.toLowerCase();
    const filtered = allDocs.filter((d: DocumentInfo) => 
      d.name.toLowerCase().includes(lowerQuery) || 
      (d.number && d.number.toLowerCase().includes(lowerQuery))
    );
    return { items: filtered, totalCount: filtered.length, page, pageSize };
  } catch (e) {
    const lowerQuery = query.toLowerCase();
    const filtered = DEMO_DOCUMENTS.filter(d => 
      d.name.toLowerCase().includes(lowerQuery) || 
      (d.number && d.number.toLowerCase().includes(lowerQuery))
    );
    return { items: filtered, totalCount: filtered.length, page, pageSize };
  }
}

/**
 * Получение данных с кэшированием
 */
export async function getCachedData<T>(
  key: string, 
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = pravoCache.get(key);
  if (cached) {
    return cached as T;
  }
  
  const data = await fetcher();
  pravoCache.set(key, data);
  return data;
}
