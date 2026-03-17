import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Eye, Code, Bold, Italic, Underline, List, ListOrdered, Link, Image, Heading1, Heading2, Quote, Undo, Redo, Quote as QuoteIcon, Youtube, Images, X, Loader2, AlertCircle, Link2, Check, Puzzle, GripVertical, FileText, Upload, Download, Share2, File, Plus, Trash2, Move, Table, ChevronDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HtmlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void; // Колбэк для сохранения
  placeholder?: string;
  minHeight?: number;
}

const HtmlEditorComponent = ({ value, onChange, onSave, placeholder = 'Введите текст статьи...', minHeight = 400 }: HtmlEditorProps) => {
  const [mode, setMode] = useState<'visual' | 'html'>('visual');
  const [htmlValue, setHtmlValue] = useState(value);
  const [showGooglePhotosModal, setShowGooglePhotosModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [showShortcodeModal, setShowShortcodeModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentUploading, setDocumentUploading] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<{id: string; name: string; url: string; created_at: string}[]>([]);
  const [selectedShortcodeCategory, setSelectedShortcodeCategory] = useState<string>('CTA Блоки');
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('https://');
  const [youTubeUrl, setYouTubeUrl] = useState('');
  const [googlePhotosUrl, setGooglePhotosUrl] = useState('');
  const [googlePhotosMode, setGooglePhotosMode] = useState<'single' | 'multiple' | 'album'>('single');
  const [googlePhotosLoading, setGooglePhotosLoading] = useState(false);
  const [googlePhotosError, setGooglePhotosError] = useState('');
  const [googlePhotosImages, setGooglePhotosImages] = useState<string[]>([]);
  const [googlePhotosSelected, setGooglePhotosSelected] = useState<Set<number>>(new Set());
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkButtonRef = useRef<HTMLButtonElement>(null);
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  
  // История отмены/повтора
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isUndoRedo, setIsUndoRedo] = useState(false);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const isInitializedRef = useRef(false);
  
  // Реф для сохранения позиции курсора перед открытием модальных окон
  const savedSelectionRef = useRef<{
    range: Range;
    selection: Selection;
  } | null>(null);
  
  // Реф для сохранения позиции прокрутки
  const scrollPositionRef = useRef<{ top: number; left: number }>({ top: 0, left: 0 });
  
  // Состояние для плавающей панели
  const [floatingToolbar, setFloatingToolbar] = useState<{ type: 'link' | 'image' | 'youtube' | 'google-photos' | null; position: { top: number; left: number } }>({ type: null, position: { top: 0, left: 0 } });

  // Состояние для перетаскивания в таблице
  const [draggedRow, setDraggedRow] = useState<number | null>(null);
  const [dragOverRow, setDragOverRow] = useState<number | null>(null);

  // Инициализация истории при первом рендере
  useEffect(() => {
    if (!isInitializedRef.current) {
      // Инициализируем историю с пустым начальным состоянием
      const initialContent = value || '';
      historyRef.current = [initialContent];
      historyIndexRef.current = 0;
      setHistory([initialContent]);
      setHistoryIndex(0);
      isInitializedRef.current = true;
    }
  }, []);

  // Реф для отслеживания изменений из самого редактора
  const isInternalChangeRef = useRef(false);
  
  // Инициализация редактора при первом рендере
  useEffect(() => {
    if (editorRef.current && !isInitializedRef.current) {
      editorRef.current.innerHTML = value || '';
      isInitializedRef.current = true;
    }
    // Также инициализируем htmlValue если оно пустое, а value есть
    if (!htmlValue && value) {
      setHtmlValue(value);
    }
  }, []);

  // Синхронизация htmlValue с value пропсом при изменении
  useEffect(() => {
    // Только обновляем если мы в визуальном режиме или если значение принципиально изменилось
    if (mode === 'visual') {
      // В визуальном режиме используем editorRef
    } else {
      // В HTML режиме синхронизируем если значение пришло извне
      if (value && value !== htmlValue && editorRef.current) {
        // Проверяем, инициализирован ли редактор
        if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>') {
          setHtmlValue(value);
        }
      }
    }
  }, [value]);

  // Синхронизация при переключении на HTML режим
  useEffect(() => {
    if (mode === 'html') {
      // При переключении на HTML режим получаем актуальный HTML из визуального редактора
      let htmlToUse = '';
      
      if (editorRef.current) {
        const currentHtml = editorRef.current.innerHTML;
        htmlToUse = (currentHtml && currentHtml !== '<br>') ? currentHtml : '';
      }
      
      // Также используем value проп если editor пустой
      if (!htmlToUse && value) {
        htmlToUse = value;
      }
      
      // Всегда обновляем htmlValue при переключении на HTML режим
      setHtmlValue(htmlToUse);
      onChange(htmlToUse);
    }
  }, [mode]);

  // Инициализация при переключении на визуальный режим
  useEffect(() => {
    if (mode === 'visual' && editorRef.current) {
      if (!editorRef.current.innerHTML || editorRef.current.innerHTML === '<br>') {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [mode]);

  // Обновление состояния кнопок отмены/повтора
  useEffect(() => {
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
  }, [historyIndex, history]);

  // Обработчик изменений в визуальном режиме
  const handleVisualInput = useCallback(() => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (editorRef.current) {
      const newValue = editorRef.current.innerHTML;
      
      // Обновляем только если значение действительно изменилось
      if (newValue !== htmlValue) {
        setHtmlValue(newValue);
        
        // Сохраняем в историю, если это не отмена/повтор
        if (!isUndoRedoRef.current) {
          const currentIndex = historyIndexRef.current;
          const currentHistory = historyRef.current;
          const currentValue = currentHistory[currentIndex] || '';
          
          // Не сохраняем если значение не изменилось
          if (newValue !== currentValue) {
            // Удаляем все записи после текущей позиции
            const newHistory = currentHistory.slice(0, currentIndex + 1);
            newHistory.push(newValue);
            
            // Ограничиваем историю 50 записями
            if (newHistory.length > 50) {
              newHistory.shift();
            } else {
              historyIndexRef.current++;
            }
            
            historyRef.current = newHistory;
            setHistory([...newHistory]);
            setHistoryIndex(historyIndexRef.current);
          }
        }
        
        isUndoRedoRef.current = false;
        onChange(newValue);
      }
    }
  }, [htmlValue, onChange]);

  // Отмена (undo)
  const handleUndo = () => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (historyIndexRef.current > 0) {
      isUndoRedoRef.current = true;
      historyIndexRef.current--;
      const prevValue = historyRef.current[historyIndexRef.current];
      
      if (editorRef.current) {
        editorRef.current.innerHTML = prevValue;
      }
      setHtmlValue(prevValue);
      onChange(prevValue);
      setHistoryIndex(historyIndexRef.current);
    } else if (historyIndexRef.current === 0 && historyRef.current.length > 1) {
      // Для самого первого изменения
      isUndoRedoRef.current = true;
      // Удаляем первую запись (самое первое состояние - пустое или начальное)
      const newHistory = historyRef.current.slice(1);
      historyRef.current = newHistory;
      historyIndexRef.current = 0;
      const firstValue = newHistory[0];
      
      if (editorRef.current) {
        editorRef.current.innerHTML = firstValue;
      }
      setHtmlValue(firstValue);
      onChange(firstValue);
      setHistory([...newHistory]);
      setHistoryIndex(0);
    }
  };

  // Повтор (redo)
  const handleRedo = () => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoRef.current = true;
      historyIndexRef.current++;
      const nextValue = historyRef.current[historyIndexRef.current];
      
      if (editorRef.current) {
        editorRef.current.innerHTML = nextValue;
      }
      setHtmlValue(nextValue);
      onChange(nextValue);
      setHistoryIndex(historyIndexRef.current);
    }
  };

  // Обработчик горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Проверяем, что Ctrl (или Cmd на Mac) нажат
      const isMod = e.ctrlKey || e.metaKey;
      
      if (isMod) {
        // Ctrl+S - Сохранить
        if (e.key === 's') {
          e.preventDefault();
          if (onSave) {
            onSave();
          }
          return;
        }
        
        // Ctrl+Z - Отменить
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
          return;
        }
        
        // Ctrl+Y или Ctrl+Shift+Z - Повторить
        if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
          return;
        }
        
        // Ctrl+B - Жирный
        if (e.key === 'b') {
          e.preventDefault();
          execCommand('bold');
          return;
        }
        
        // Ctrl+I - Курсив
        if (e.key === 'i') {
          e.preventDefault();
          execCommand('italic');
          return;
        }
        
        // Ctrl+U - Подчёркнутый
        if (e.key === 'u') {
          e.preventDefault();
          execCommand('underline');
          return;
        }
      }
    };
    
    // Добавляем обработчик только в визуальном режиме
    if (mode === 'visual') {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mode, onSave]);

  // Обработчик изменений в HTML режиме
  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setHtmlValue(newValue);
    onChange(newValue);
  };

  // Команды форматирования
  const execCommand = (command: string, value?: string) => {
    // Сначала фокусируем редактор
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    // Проверяем, есть ли выделение внутри редактора
    const selection = window.getSelection();
    let hasValidSelection = false;
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      hasValidSelection = editorRef.current.contains(range.commonAncestorContainer);
    }
    
    // Если нет валидного выделения внутри редактора, пробуем создать диапазон в позиции курсора
    if (!hasValidSelection) {
      try {
        // Пробуем найти последнюю позицию с текстом
        const range = document.createRange();
        
        // Если есть контент, выделяем его весь
        if (editorRef.current.firstChild) {
          range.selectNodeContents(editorRef.current);
          range.collapse(false);
        } else {
          range.selectNodeContents(editorRef.current);
        }
        
        selection?.removeAllRanges();
        selection?.addRange(range);
      } catch (e) {
        // Игнорируем ошибки
      }
    }
    
    // Выполняем команду
    const success = document.execCommand(command, false, value);
    
    // Обновляем значение после выполнения команды
    handleVisualInput();
    
    return success;
  };

  // Вставка HTML тегов
  const insertTag = (openingTag: string, closingTag: string) => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Если нет выделения, просто вставляем теги в конец
      if (editorRef.current) {
        editorRef.current.innerHTML += `${openingTag}${closingTag}`;
        handleVisualInput();
      }
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    const span = document.createElement('span');
    span.innerHTML = `${openingTag}${selectedText}${closingTag}`;
    
    range.deleteContents();
    range.insertNode(span);
    
    // Переместить курсор после вставленного текста
    range.setStartAfter(span);
    range.setEndAfter(span);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleVisualInput();
  };

  // Функция для выравнивания изображений и видео
  const alignMedia = (align: 'left' | 'center' | 'right') => {
    if (!editorRef.current) return;
    
    // Фокусируем редактор
    editorRef.current.focus();
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Проверяем, есть ли выделение
    const selectedText = selection.toString();
    const hasSelection = selectedText.length > 0;
    
    // Находим выделенный элемент (img или iframe)
    let targetNode: Node | null = null;
    let targetElement: HTMLElement | null = null;
    
    // Если есть выделение текста, пробуем найти img/iframe внутри выделения
    if (hasSelection) {
      // Пробуем найти элементы внутри выделения
      try {
        const container = range.commonAncestorContainer;
        if (container && container.nodeType === Node.ELEMENT_NODE) {
          const el = container as HTMLElement;
          // Ищем img или iframe внутри элемента
          const img = el.querySelector ? el.querySelector('img') : null;
          const iframe = el.querySelector ? el.querySelector('iframe') : null;
          if (img) {
            targetNode = img;
            targetElement = img as HTMLElement;
          } else if (iframe) {
            targetNode = iframe;
            targetElement = iframe as HTMLElement;
          }
          // Также проверяем, сам ли элемент является img/iframe
          if (!targetElement && (el.nodeName === 'IMG' || el.nodeName === 'IFRAME')) {
            targetNode = el;
            targetElement = el;
          }
        }
      } catch (e) {
        console.error('Error finding selected element:', e);
      }
    }
    
    // Если не нашли через выделение, ищем через commonAncestorContainer
    if (!targetNode || !targetElement) {
      let node: Node | null = range.commonAncestorContainer;
      
      // Если это текстовый узел, берём родителя
      if (node && node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
      }
      
      // Поднимаемся вверх по DOM пока не дойдём до editor
      while (node && node !== editorRef.current) {
        // Проверяем, является ли node img или iframe
        if (node.nodeName === 'IMG' || node.nodeName === 'IFRAME') {
          targetNode = node;
          targetElement = node as HTMLElement;
          break;
        }
        // Проверяем, содержит ли node img или iframe
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          const img = el.querySelector ? el.querySelector('img') : null;
          const iframe = el.querySelector ? el.querySelector('iframe') : null;
          if (img) {
            targetNode = img;
            targetElement = img as HTMLElement;
            break;
          }
          if (iframe) {
            targetNode = iframe;
            targetElement = iframe as HTMLElement;
            break;
          }
        }
        node = node.parentNode as Node;
      }
    }
    
    // Если элемент не найден, пробуем найти ближайшее изображение рядом с курсором
    if (!targetNode || !targetElement) {
      const allImages = editorRef.current.querySelectorAll('img');
      const allIframes = editorRef.current.querySelectorAll('iframe');
      
      // Пробуем найти позицию курсора
      const cursorRect = range.getBoundingClientRect();
      
      if (cursorRect && (allImages.length > 0 || allIframes.length > 0)) {
        // Ищем ближайшее изображение или видео к курсору
        let closestEl: HTMLElement | null = null;
        let closestDist = Infinity;
        
        allImages.forEach(img => {
          const rect = img.getBoundingClientRect();
          const dist = Math.min(
            Math.abs(rect.top - cursorRect.top),
            Math.abs(rect.bottom - cursorRect.bottom),
            Math.abs(rect.left - cursorRect.left),
            Math.abs(rect.right - cursorRect.right)
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestEl = img as HTMLElement;
          }
        });
        
        allIframes.forEach(iframe => {
          const rect = iframe.getBoundingClientRect();
          const dist = Math.min(
            Math.abs(rect.top - cursorRect.top),
            Math.abs(rect.bottom - cursorRect.bottom),
            Math.abs(rect.left - cursorRect.left),
            Math.abs(rect.right - cursorRect.right)
          );
          if (dist < closestDist) {
            closestDist = dist;
            closestEl = iframe as HTMLElement;
          }
        });
        
        if (closestEl && closestDist < 500) { // Если элемент достаточно близко
          targetElement = closestEl;
          targetNode = closestEl;
        }
      }
    }
    
    // Если нашли элемент, применяем выравнивание
    if (targetNode && targetElement) {
      // Проверяем, есть ли родительский div с text-align
      let parent = targetElement.parentElement;
      let foundWrapper = false;
      
      while (parent && parent !== editorRef.current) {
        // Проверяем наличие text-align стиля
        if (parent.style && parent.style.textAlign) {
          // Обновляем выравнивание
          parent.style.textAlign = align;
          foundWrapper = true;
          break;
        }
        // Также проверяем атрибут style в HTML
        const styleAttr = parent.getAttribute('style');
        if (styleAttr && styleAttr.includes('text-align')) {
          parent.style.textAlign = align;
          foundWrapper = true;
          break;
        }
        parent = parent.parentElement;
      }
      
      // Если не нашли существующую обёртку, создаём новую
      if (!foundWrapper) {
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = align;
        wrapper.style.margin = '20px 0';
        
        // Вставляем wrapper перед элементом
        if (targetElement.parentNode) {
          targetElement.parentNode.insertBefore(wrapper, targetElement);
          wrapper.appendChild(targetElement);
        }
      }
      
      handleVisualInput();
    } else {
      // Если элемент не найден, пробуем использовать execCommand для выравнивания текста
      // Для left/center/right используем formatBlock или justify
      if (align === 'left') {
        execCommand('justifyLeft');
      } else if (align === 'center') {
        execCommand('justifyCenter');
      } else if (align === 'right') {
        execCommand('justifyRight');
      }
    }
  };

  // Вставка ссылки - показывает плавающую панель
  const insertLink = () => {
    // Сохраняем позицию курсора перед открытием модального окна
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedSelectionRef.current = {
        range: selection.getRangeAt(0).cloneRange(),
        selection: selection
      };
    }
    
    const selectedText = selection?.toString() || '';
    setLinkText(selectedText);
    setLinkUrl('https://');
    
    // Получаем позицию кнопки для плавающей панели
    if (linkButtonRef.current) {
      const rect = linkButtonRef.current.getBoundingClientRect();
      setFloatingToolbar({
        type: 'link',
        position: { top: rect.bottom + 8, left: rect.left }
      });
    }
  };

  // Обработчик вставки ссылки из плавающей панели
  const handleInsertLink = () => {
    if (linkUrl && linkUrl !== 'https://') {
      const linkHtml = linkText 
        ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkText}</a>`
        : `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${linkUrl}</a>`;
      insertAtCursor(linkHtml);
    }
    setFloatingToolbar({ type: null, position: { top: 0, left: 0 } });
  };

  // Вставка изображения - показывает плавающую панель
  const insertImage = () => {
    // Сохраняем позицию курсора перед открытием модального окна
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedSelectionRef.current = {
        range: selection.getRangeAt(0).cloneRange(),
        selection: selection
      };
    }
    
    setImageUrl('https://');
    
    // Получаем позицию кнопки для плавающей панели
    if (imageButtonRef.current) {
      const rect = imageButtonRef.current.getBoundingClientRect();
      setFloatingToolbar({
        type: 'image',
        position: { top: rect.bottom + 8, left: rect.left }
      });
    }
  };

  // Обработчик вставки изображения из плавающей панели
  const handleInsertImage = () => {
    if (imageUrl) {
      // Создаём img тег с lazy loading и центрированием
      const imgHtml = `<div style="text-align:center;margin:20px 0;"><img src="${imageUrl}" alt="Изображение" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,0.1);"></div>`;
      // Используем insertAtCursor для вставки в позицию курсора
      insertAtCursor(imgHtml);
    }
    setFloatingToolbar({ type: null, position: { top: 0, left: 0 } });
  };

  // Вставка YouTube видео - показывает плавающую панель
  const insertYouTubeVideo = () => {
    // Сохраняем позицию курсора перед открытием модального окна
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedSelectionRef.current = {
        range: selection.getRangeAt(0).cloneRange(),
        selection: selection
      };
    }
    
    setYouTubeUrl('');
    
    // Позиционируем панель относительно кнопки YouTube
    const buttons = document.querySelectorAll('[data-youtube-btn]');
    const ytButton = buttons[0] as HTMLButtonElement;
    if (ytButton) {
      const rect = ytButton.getBoundingClientRect();
      setFloatingToolbar({
        type: 'youtube',
        position: { top: rect.bottom + 8, left: rect.left }
      });
    } else {
      setFloatingToolbar({
        type: 'youtube',
        position: { top: 100, left: 100 }
      });
    }
  };

  // Обработчик вставки YouTube из плавающей панели
  const handleInsertYouTube = () => {
    if (!youTubeUrl) return;

    // Извлекаем ID видео из различных форматов URL
    let videoId = '';
    
    // Удаляем параметры URL (например, ?si=...) перед обработкой
    const cleanUrl = youTubeUrl.split('?')[0];
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
    ];

    for (const pattern of patterns) {
      const match = cleanUrl.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) {
      alert('Неверный формат URL YouTube видео');
      return;
    }

     // Вставляем заглушку YouTube с превью - загружается только при клике
     // Используем fallback для thumbnail: maxresdefault -> high -> default
     const thumbnailUrl = 'https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg';
     const embedUrl = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=0&controls=1&fs=1&enablejsapi=0&widgetid=1&noapi=1&disable_polymer=1&hl=ru&cc_lang_pref=ru&iv_load_policy=3&loop=0&playlist=&start=0&end=0&playsinline=1&autohide=1&showinfo=0&controls=1&modestbranding=1&rel=0&disable_web_ui=0&enablejsapi=0&origin=' + window.location.origin + '&disableads=1&noads=1';
     
     // Создаём iframe HTML для вставки при клике
     const iframeHtml = '<iframe width="100%" height="100%" src="' + embedUrl + '" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe>';
    
    // Кодируем для использования в onclick
    const encodedIframe = iframeHtml.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
     // Простая и стабильная вставка YouTube видео
     const placeholderHtml = `<div style="text-align:center;margin:20px 0;"><div class="youtube-embed" style="position:relative;width:100%;max-width:800px;aspect-ratio:16/9;background:#000;border-radius:16px;overflow:hidden;display:inline-block;box-shadow:0 10px 40px rgba(0,0,0,0.3);"><iframe src="https://www.youtube.com/embed/${videoId}?rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&controls=1&fs=1&hl=ru&cc_lang_pref=ru" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;"></iframe></div></div>`;
    
    // Используем insertAtCursor для вставки в позицию курсора
    insertAtCursor(placeholderHtml);

    setFloatingToolbar({ type: null, position: { top: 0, left: 0 } });
  };

  // Открыть модальное окно Google Photos
  const openGooglePhotosModal = () => {
    // Сохраняем позицию курсора перед открытием модального окна
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
      savedSelectionRef.current = {
        range: selection.getRangeAt(0).cloneRange(),
        selection: selection
      };
    }
    
    setShowGooglePhotosModal(true);
    setGooglePhotosUrl('');
    setGooglePhotosError('');
    setGooglePhotosImages([]);
  };

  // Закрыть модальное окно Google Photos
  const closeGooglePhotosModal = () => {
    savedSelectionRef.current = null;
    setShowGooglePhotosModal(false);
    setGooglePhotosUrl('');
    setGooglePhotosError('');
    setGooglePhotosImages([]);
    setGooglePhotosSelected(new Set());
  };

  // Переключение выбора изображения
  const toggleGooglePhotoSelection = (index: number) => {
    const newSelected = new Set(googlePhotosSelected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setGooglePhotosSelected(newSelected);
  };

  // Выбрать все изображения
  const selectAllGooglePhotos = () => {
    const allIndices = new Set(googlePhotosImages.map((_, i) => i));
    setGooglePhotosSelected(allIndices);
  };

  // Снять выбор со всех изображений
  const deselectAllGooglePhotos = () => {
    setGooglePhotosSelected(new Set());
  };

  // Обработка поиска изображений Google Photos
  const handleGooglePhotosSearch = async () => {
    if (!googlePhotosUrl.trim()) {
      setGooglePhotosError('Введите ссылку Google Photos');
      return;
    }

    setGooglePhotosLoading(true);
    setGooglePhotosError('');
    setGooglePhotosImages([]);

    try {
      const { data, error } = await supabase.functions.invoke('google-photos', {
        body: { url: googlePhotosUrl.trim(), mode: googlePhotosMode }
      });

      if (error) throw error;

      if (data.success) {
        setGooglePhotosImages(data.images || []);
      } else {
        setGooglePhotosError(data.error || 'Не удалось получить изображения');
      }
    } catch (err: any) {
      console.error('Google Photos error:', err);
      setGooglePhotosError(err.message || 'Ошибка при получении изображений');
    } finally {
      setGooglePhotosLoading(false);
    }
  };

  // Вставить выбранные изображения в редактор
  const insertGooglePhotosImages = () => {
    // Используем выбранные изображения или все, если ничего не выбрано
    const imagesToInsert = googlePhotosSelected.size > 0
      ? googlePhotosImages.filter((_, i) => googlePhotosSelected.has(i))
      : googlePhotosImages;

    if (imagesToInsert.length === 0) return;

    let html = '';
    if (imagesToInsert.length === 1) {
      // Одиночное изображение с центрированием
      html = `<div style="text-align:center;margin:20px 0;"><img src="${imagesToInsert[0]}" alt="Google Photos" loading="lazy" style="max-width:100%;height:auto;border-radius:12px;display:inline-block;box-shadow:0 4px 20px rgba(0,0,0,0.1);"></div>`;
    } else {
      // Галерея изображений
      html = '<div class="google-photos-gallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 16px 0;">';
      for (const imgUrl of imagesToInsert) {
        html += `<img src="${imgUrl}" alt="Google Photos" loading="lazy" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; display: block;">`;
      }
      html += '</div>';
    }

    // Используем insertAtCursor для вставки в позицию курсора
    insertAtCursor(html);
    closeGooglePhotosModal();
  };

  // Вставка HTML в позицию курсора
  const insertAtCursor = (html: string) => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (mode === 'visual') {
      if (!editorRef.current) return;
      
      // Сохраняем текущую позицию прокрутки
      const editorContainer = editorRef.current.parentElement;
      if (editorContainer) {
        scrollPositionRef.current = {
          top: editorContainer.scrollTop,
          left: editorContainer.scrollLeft
        };
      }
      
      // Сначала фокусируем редактор
      editorRef.current.focus();
      
      // Пробуем использовать сохранённую позицию курсора
      if (savedSelectionRef.current && savedSelectionRef.current.range) {
        try {
          const range = savedSelectionRef.current.range;
          const selection = window.getSelection();
          
          // Проверяем, что диапазон всё ещё валиден и находится внутри редактора
          if (range.commonAncestorContainer && editorRef.current.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            const fragment = range.createContextualFragment(html);
            range.insertNode(fragment);
            range.collapse(false);
            
            if (selection) {
              selection.removeAllRanges();
              selection.addRange(range);
            }
            
            savedSelectionRef.current = null;
            handleVisualInput();
            
            // Восстанавливаем позицию прокрутки
            setTimeout(() => {
              const editorContainer = editorRef.current?.parentElement;
              if (editorContainer) {
                editorContainer.scrollTop = scrollPositionRef.current.top;
                editorContainer.scrollLeft = scrollPositionRef.current.left;
              }
            }, 10);
            return;
          }
        } catch (e) {
          // Если ошибка, пробуем другой способ
          console.warn('Error using saved selection, trying fallback:', e);
          savedSelectionRef.current = null;
        }
      }
      
      const selection = window.getSelection();
      
        if (selection && selection.rangeCount > 0) {
         const range = selection.getRangeAt(0);
         
         // Проверяем, находится ли курсор внутри редактора
         if (editorRef.current.contains(range.commonAncestorContainer)) {
           range.deleteContents();
           const fragment = range.createContextualFragment(html);
           range.insertNode(fragment);
           range.collapse(false);
           selection.removeAllRanges();
           selection.addRange(range);
         } else {
           // Курсор вне редактора - вставляем в конец
           editorRef.current.insertAdjacentHTML('beforeend', html);
           // Прокручиваем к концу редактора
           const range = document.createRange();
           range.selectNodeContents(editorRef.current);
           range.collapse(false);
           selection?.removeAllRanges();
           selection?.addRange(range);
         }
       } else {
         // Нет выделения - вставляем в конец
         editorRef.current.insertAdjacentHTML('beforeend', html);
         // Прокручиваем к концу редактора
         const range = document.createRange();
         range.selectNodeContents(editorRef.current);
         range.collapse(false);
         const selection = window.getSelection();
         selection?.removeAllRanges();
         selection?.addRange(range);
       }
      
      handleVisualInput();
      
      // Восстанавливаем позицию прокрутки
      setTimeout(() => {
        const editorContainer = editorRef.current?.parentElement;
        if (editorContainer) {
          editorContainer.scrollTop = scrollPositionRef.current.top;
          editorContainer.scrollLeft = scrollPositionRef.current.left;
        }
      }, 10);
    } else {
      // В HTML режиме вставляем в текстовое поле
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      
      const newValue = value.substring(0, start) + html + value.substring(end);
      setHtmlValue(newValue);
      onChange(newValue);
      
      // Устанавливаем курсор после вставленного контента
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + html.length, start + html.length);
      }, 0);
    }
  };

  // Вставка заголовков и блоков
  const insertBlock = (tag: string) => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (editorRef.current) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);
      
      if (range && range.toString().length > 0) {
        // Если есть выделение, оборачиваем в тег
        const wrapper = document.createElement(tag);
        wrapper.innerHTML = range.toString();
        range.deleteContents();
        range.insertNode(wrapper);
      } else {
        // Если нет выделения, вставляем пустой тег в позицию курсора
        const emptyHtml = `<${tag}></${tag}><br>`;
        insertAtCursor(emptyHtml);
      }
      
      handleVisualInput();
    }
  };

  // Определения шорткодов
  interface Shortcode {
    id: string;
    name: string;
    icon: string;
    category: string;
    html: string;
  }

  const shortcodes: Shortcode[] = [
    // Улучшенные кнопки с центрированием
    {
      id: 'button-primary',
      name: 'Кнопка (основная)',
      icon: '🔘',
      category: 'Кнопки',
      html: '<div style="text-align:center;margin:20px 0;"><a href="#" class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">Текст кнопки</a></div>'
    },
    {
      id: 'button-secondary',
      name: 'Кнопка (вторичная)',
      icon: '⚪',
      category: 'Кнопки',
      html: '<div style="text-align:center;margin:20px 0;"><a href="#" class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-600 dark:hover:to-slate-500 text-slate-900 dark:text-white font-semibold rounded-xl shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">Текст кнопки</a></div>'
    },
    {
      id: 'button-outline',
      name: 'Кнопка (контурная)',
      icon: '🔲',
      category: 'Кнопки',
      html: '<div style="text-align:center;margin:20px 0;"><a href="#" class="inline-flex items-center justify-center px-8 py-4 border-2 border-blue-500 hover:bg-blue-500 text-blue-500 hover:text-white font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]">Текст кнопки</a></div>'
    },
    {
      id: 'button-danger',
      name: 'Кнопка (опасное действие)',
      icon: '🔴',
      category: 'Кнопки',
      html: '<div style="text-align:center;margin:20px 0;"><a href="#" class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">Текст кнопки</a></div>'
    },
    {
      id: 'button-success',
      name: 'Кнопка (успех)',
      icon: '🟢',
      category: 'Кнопки',
      html: '<div style="text-align:center;margin:20px 0;"><a href="#" class="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]">Текст кнопки</a></div>'
    },
    // CTA блок - калькулятор госпошлины
    {
      id: 'cta-box-calculator',
      name: 'CTA: Калькулятор',
      icon: '🧮',
      category: 'CTA Блоки',
      html: '<div class="cta-box-calculator">\n  <p><strong>Сервис автоматически рассчитает размер госпошлины.</strong></p>\n  <a href="/calculator" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;"></a>\n</div>'
    },
    // CTA блок - Госуслуги
    {
      id: 'cta-box-gosuslugi',
      name: 'CTA: Госуслуги',
      icon: '🏛️',
      category: 'CTA Блоки',
      html: '<div class="cta-box-gosuslugi">\n  <p><strong>Не хотите разбираться в документах?</strong></p>\n  <p>Сервис автоматически сформирует иск и подскажет, какие файлы прикрепить.</p>\n  <a href="https://www.gosuslugi.ru/newsearch/gas-pravosudie" class="cta-button" rel="nofollow noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;"></a>\n</div>'
    },
    // CTA блок - универсальный
    {
      id: 'cta-box',
      name: 'Блок призыва (CTA)',
      icon: '📢',
      category: 'CTA Блоки',
      html: '<div class="cta-box">\n  <p><strong>Хотите узнать больше?</strong></p>\n  <a href="/contact" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;"></a>\n</div>'
    },
    // CTA блок - акцентный (зелёный)
    {
      id: 'cta-box-accent',
      name: 'CTA: Акцентный',
      icon: '✅',
      category: 'CTA Блоки',
      html: '<div class="cta-box-accent">\n  <p><strong>Готовы начать?</strong></p>\n  <a href="/register" class="cta-button" style="display:inline-flex;align-items:center;justify-content:center;min-width:48px;min-height:48px;padding:12px 24px;background:linear-gradient(135deg,#22c55e,#16a34a);color:white;font-weight:600;text-decoration:none;border-radius:12px;font-size:14px;margin-top:8px;"></a>\n</div>'
    },
    // Нативная реклама
    {
      id: 'ad-native',
      name: 'Нативная реклама',
      icon: '📢',
      category: 'Кнопки',
      html: `<div class="ad-native" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
  <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
    <span style="background: #fbbf24; color: #78350f; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Реклама</span>
  </div>
  <div style="display: flex; gap: 16px; align-items: center;">
    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
      <span style="color: white; font-size: 32px;">📢</span>
    </div>
    <div style="flex: 1; min-width: 0;">
      <p style="font-weight: 700; color: #1e293b; margin: 0 0 6px; font-size: 16px;">Ваша реклама здесь</p>
      <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">Привлекайте клиентов, которым нужны юридические услуги.</p>
    </div>
  </div>
  <a href="/contacts" style="display: inline-block; margin-top: 16px; padding: 10px 20px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 14px;">Узнать подробнее →</a>
</div>`
    },
    // Улучшенные карточки
    {
      id: 'card-info',
      name: 'Карточка информации',
      icon: '💳',
      category: 'Карточки',
      html: '<div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-l-4 border-blue-500 p-5 rounded-r-xl my-4 shadow-sm">\n  <div class="flex items-start gap-3">\n    <span class="text-2xl">💳</span>\n    <div>\n      <p class="font-semibold text-blue-900 dark:text-blue-100">Информация</p>\n      <p class="text-blue-800 dark:text-blue-200 text-sm mt-1">Здесь находится важная информация для пользователя.</p>\n    </div>\n  </div>\n</div>'
    },
    {
      id: 'card-warning',
      name: 'Карточка предупреждения',
      icon: '⚠️',
      category: 'Карточки',
      html: '<div class="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-l-4 border-amber-500 p-5 rounded-r-xl my-4 shadow-sm">\n  <div class="flex items-start gap-3">\n    <span class="text-2xl">⚠️</span>\n    <div>\n      <p class="font-semibold text-amber-900 dark:text-amber-100">Внимание!</p>\n      <p class="text-amber-800 dark:text-amber-200 text-sm mt-1">Обратите внимание! Это важное предупреждение.</p>\n    </div>\n  </div>\n</div>'
    },
    {
      id: 'card-success',
      name: 'Карточка успеха',
      icon: '✅',
      category: 'Карточки',
      html: '<div class="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-l-4 border-emerald-500 p-5 rounded-r-xl my-4 shadow-sm">\n  <div class="flex items-start gap-3">\n    <span class="text-2xl">✅</span>\n    <div>\n      <p class="font-semibold text-emerald-900 dark:text-emerald-100">Успех</p>\n      <p class="text-emerald-800 dark:text-emerald-200 text-sm mt-1">Отлично! Действие выполнено успешно.</p>\n    </div>\n  </div>\n</div>'
    },
    {
      id: 'card-error',
      name: 'Карточка ошибки',
      icon: '❌',
      category: 'Карточки',
      html: '<div class="bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30 border-l-4 border-red-500 p-5 rounded-r-xl my-4 shadow-sm">\n  <div class="flex items-start gap-3">\n    <span class="text-2xl">❌</span>\n    <div>\n      <p class="font-semibold text-red-900 dark:text-red-100">Ошибка</p>\n      <p class="text-red-800 dark:text-red-200 text-sm mt-1">Произошла ошибка. Пожалуйста, попробуйте ещё раз.</p>\n    </div>\n  </div>\n</div>'
    },
    // Улучшенные алерты
    {
      id: 'alert-info',
      name: 'Алерт (информация)',
      icon: 'ℹ️',
      category: 'Алерты',
      html: '<div class="flex items-start gap-3 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl my-4 shadow-sm border border-slate-200 dark:border-slate-700">\n  <span class="text-2xl">ℹ️</span>\n  <div>\n    <p class="font-semibold text-slate-900 dark:text-white">Информация</p>\n    <p class="text-slate-600 dark:text-slate-300 text-sm">Здесь находится дополнительная информация.</p>\n  </div>\n</div>'
    },
    {
      id: 'alert-tip',
      name: 'Алерт (совет)',
      icon: '💡',
      category: 'Алерты',
      html: '<div class="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl my-4 shadow-sm border border-yellow-200 dark:border-yellow-800">\n  <span class="text-2xl">💡</span>\n  <div>\n    <p class="font-semibold text-yellow-900 dark:text-yellow-100">Полезный совет</p>\n    <p class="text-yellow-800 dark:text-yellow-200 text-sm">Воспользуйтесь этим советом для улучшения результата.</p>\n  </div>\n</div>'
    },
    // Улучшенные таблицы с возможностью перетаскивания
    {
      id: 'table-simple',
      name: 'Таблица (стильная)',
      icon: '📊',
      category: 'Таблицы',
      html: '<div class="overflow-x-auto my-4">\n  <table class="w-full border-collapse bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg">\n    <thead>\n      <tr class="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">\n        <th class="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">Заголовок 1</th>\n        <th class="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">Заголовок 2</th>\n        <th class="px-4 py-3 text-left text-sm font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-600">Заголовок 3</th>\n        <th class="w-10 px-2 py-3 border-b border-slate-200 dark:border-slate-600"></th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 1</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 2</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 3</td>\n        <td class="w-10 px-2 py-3 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">⋮⋮</td>\n      </tr>\n      <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-100 dark:border-slate-700">\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 4</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 5</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 6</td>\n        <td class="w-10 px-2 py-3 text-center cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">⋮⋮</td>\n      </tr>\n    </tbody>\n  </table>\n</div>'
    },
    {
      id: 'table-striped',
      name: 'Таблица (полосатая)',
      icon: '📋',
      category: 'Таблицы',
      html: '<div class="overflow-x-auto my-4">\n  <table class="w-full border-collapse bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-lg">\n    <thead>\n      <tr class="bg-gradient-to-r from-indigo-500 to-purple-600">\n        <th class="px-4 py-3 text-left text-sm font-semibold text-white">Заголовок 1</th>\n        <th class="px-4 py-3 text-left text-sm font-semibold text-white">Заголовок 2</th>\n        <th class="px-4 py-3 text-left text-sm font-semibold text-white">Заголовок 3</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr class="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 1</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 2</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 3</td>\n      </tr>\n      <tr class="border-b border-slate-100 dark:border-slate-700">\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 4</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 5</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 6</td>\n      </tr>\n      <tr class="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-100 dark:border-slate-700">\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 7</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 8</td>\n        <td class="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">Ячейка 9</td>\n      </tr>\n    </tbody>\n  </table>\n</div>'
    },
    // Разделители
    {
      id: 'divider',
      name: 'Разделитель',
      icon: '➖',
      category: 'Разное',
      html: '<hr class="my-8 border-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />'
    },
    {
      id: 'spacer',
      name: 'Отступ',
      icon: '↕️',
      category: 'Разное',
      html: '<div class="my-8"></div>'
    },
    // Колонки
    {
      id: 'columns-2',
      name: 'Две колонки',
      icon: '📑',
      category: 'Колонки',
      html: '<div class="grid grid-cols-2 gap-6 my-6">\n  <div class="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md hover:shadow-lg transition-shadow">\n    <p class="font-semibold text-slate-900 dark:text-white mb-2">Левая колонка</p>\n    <p class="text-sm text-slate-600 dark:text-slate-300">Содержимое левой колонки с описанием.</p>\n  </div>\n  <div class="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md hover:shadow-lg transition-shadow">\n    <p class="font-semibold text-slate-900 dark:text-white mb-2">Правая колонка</p>\n    <p class="text-sm text-slate-600 dark:text-slate-300">Содержимое правой колонки с описанием.</p>\n  </div>\n</div>'
    },
    {
      id: 'columns-3',
      name: 'Три колонки',
      icon: '📋',
      category: 'Колонки',
      html: '<div class="grid grid-cols-3 gap-4 my-6">\n  <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-100 dark:border-blue-800">\n    <p class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Колонка 1</p>\n    <p class="text-sm text-blue-700 dark:text-blue-300">Содержимое.</p>\n  </div>\n  <div class="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800">\n    <p class="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Колонка 2</p>\n    <p class="text-sm text-emerald-700 dark:text-emerald-300">Содержимое.</p>\n  </div>\n  <div class="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl border border-purple-100 dark:border-purple-800">\n    <p class="font-semibold text-purple-900 dark:text-purple-100 mb-2">Колонка 3</p>\n    <p class="text-sm text-purple-700 dark:text-purple-300">Содержимое.</p>\n  </div>\n</div>'
    },
    {
      id: 'columns-4',
      name: 'Четыре колонки',
      icon: '🔢',
      category: 'Колонки',
      html: '<div class="grid grid-cols-4 gap-3 my-6">\n  <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">\n    <p class="font-semibold text-slate-900 dark:text-white text-sm">Колонка 1</p>\n  </div>\n  <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">\n    <p class="font-semibold text-slate-900 dark:text-white text-sm">Колонка 2</p>\n  </div>\n  <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">\n    <p class="font-semibold text-slate-900 dark:text-white text-sm">Колонка 3</p>\n  </div>\n  <div class="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-center hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer">\n    <p class="font-semibold text-slate-900 dark:text-white text-sm">Колонка 4</p>\n  </div>\n</div>'
    },
  ];

  // Вставить шорткод в позицию курсора
  const insertShortcode = (shortcode: Shortcode) => {
    // Помечаем, что изменение пришло из редактора
    isInternalChangeRef.current = true;
    
    if (mode === 'visual') {
      // Фокусируем редактор и восстанавливаем позицию курсора перед вставкой
      if (editorRef.current) {
        // Пробуем сначала восстановить позицию курсора из savedSelectionRef
        if (savedSelectionRef.current && savedSelectionRef.current.range) {
          try {
            const range = savedSelectionRef.current.range;
            const selection = window.getSelection();
            
            // Проверяем, что диапазон всё ещё валиден
            if (range.commonAncestorContainer && editorRef.current.contains(range.commonAncestorContainer)) {
              if (selection) {
                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          } catch (e) {
            console.warn('Error restoring saved selection:', e);
          }
        }
        
        // Теперь фокусируем редактор
        editorRef.current.focus();
        
        // После фокуса пробуем получить актуальную позицию курсора
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || !editorRef.current.contains(selection.anchorNode)) {
          // Если позиция не найдена, используем сохранённую
          if (savedSelectionRef.current && savedSelectionRef.current.range) {
            try {
              const range = savedSelectionRef.current.range;
              if (range.commonAncestorContainer) {
                range.deleteContents();
                const fragment = range.createContextualFragment(shortcode.html);
                range.insertNode(fragment);
                range.collapse(false);
                
                if (selection) {
                  selection.removeAllRanges();
                  selection.addRange(range);
                }
                
                savedSelectionRef.current = null;
                handleVisualInput();
                setShowShortcodeModal(false);
                return;
              }
            } catch (e) {
              console.warn('Error using saved range:', e);
            }
          }
        }
        
        insertAtCursor(shortcode.html);
      }
    } else {
      // В HTML режиме просто вставляем шорткод
      insertAtCursor(shortcode.html);
    }
    
    setShowShortcodeModal(false);
  };

  // Функция для загрузки документа
  const handleDocumentUpload = async () => {
    if (!documentFile || !documentTitle.trim()) return;
    
    setDocumentUploading(true);
    try {
      const fileExt = documentFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `documents/${fileName}`;
      
      // Пробуем загрузить файл
      let uploadError = null;
      const { error } = await supabase.storage
        .from('files')
        .upload(filePath, documentFile);
      
      uploadError = error;
      
      // Если ошибка, пробуем создать bucket
      if (uploadError) {
        try {
          // Пробуем создать публичный bucket для файлов
          await supabase.storage.createBucket('files', {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024, // 50MB
            allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']
          });
          
          // Повторная попытка загрузки
          const { error: retryError } = await supabase.storage
            .from('files')
            .upload(filePath, documentFile);
          
          if (retryError) throw retryError;
        } catch (bucketError) {
          console.error('Bucket error:', bucketError);
          // Если не удалось создать bucket, используем base64
          throw new Error('Сохранение недоступно. Используйте внешнюю ссылку.');
        }
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const newDoc = {
        id: Date.now().toString(),
        name: documentTitle,
        url: publicUrl,
        created_at: new Date().toISOString()
      };
      
      setUploadedDocuments(prev => [...prev, newDoc]);
      setDocumentTitle('');
      setDocumentFile(null);
    } catch (err: any) {
      console.error('Error uploading document:', err);
      alert(err.message || 'Ошибка при загрузке документа');
    } finally {
      setDocumentUploading(false);
    }
  };

  // Вставить документ в редактор
  const insertDocument = (doc: { id: string; name: string; url: string }) => {
    const docHtml = `<div class="document-card" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <p style="font-weight: 600; color: #1e293b; margin: 0; font-size: 14px;">${doc.name}</p>
        <p style="color: #64748b; margin: 4px 0 0; font-size: 12px;">Документ</p>
      </div>
      <a href="${doc.url}" download="${doc.name}" style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #3b82f6; text-decoration: none; transition: all 0.2s;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
      </a>
    </div>`;
    insertAtCursor(docHtml);
    setShowDocumentModal(false);
  };

  // Получить уникальные категории шорткодов
  const shortcodeCategories = Array.from(new Set(shortcodes.map(s => s.category)));
  const toolbarButtons: any[] = [
    { icon: Undo, action: handleUndo, title: 'Отменить', disabled: !canUndo },
    { icon: Redo, action: handleRedo, title: 'Повторить', disabled: !canRedo },
    { type: 'divider' },
    { icon: Bold, action: () => execCommand('bold'), title: 'Жирный (B)' },
    { icon: Italic, action: () => execCommand('italic'), title: 'Курсив (I)' },
    { icon: Underline, action: () => execCommand('underline'), title: 'Подчёркнутый (U)' },
    { type: 'divider' },
    { icon: Heading1, action: () => insertBlock('h2'), title: 'Заголовок H2' },
    { icon: Heading2, action: () => insertBlock('h3'), title: 'Заголовок H3' },
    { type: 'divider' },
    { icon: List, action: () => execCommand('insertUnorderedList'), title: 'Маркированный список' },
    { icon: ListOrdered, action: () => execCommand('insertOrderedList'), title: 'Нумерованный список' },
    { icon: QuoteIcon, action: () => insertBlock('blockquote'), title: 'Цитата' },
    { type: 'divider' },
    { icon: Link, action: insertLink, title: 'Вставить ссылку', ref: linkButtonRef },
    { icon: Image, action: insertImage, title: 'Вставить изображение', ref: imageButtonRef },
    { icon: Images, action: openGooglePhotosModal, title: 'Вставить из Google Photos' },
    { icon: Youtube, action: insertYouTubeVideo, title: 'Вставить YouTube видео', isYoutube: true },
    { type: 'divider' },
    { icon: AlignLeft, action: () => alignMedia('left'), title: 'Выровнять по левому краю' },
    { icon: AlignCenter, action: () => alignMedia('center'), title: 'Выровнять по центру' },
    { icon: AlignRight, action: () => alignMedia('right'), title: 'Выровнять по правому краю' },
    { type: 'divider' },
    { icon: FileText, action: () => {
      // Сохраняем позицию курсора перед открытием модального окна
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
        savedSelectionRef.current = {
          range: selection.getRangeAt(0).cloneRange(),
          selection: selection
        };
      }
      setShowDocumentModal(true);
    }, title: 'Документы' },
    { icon: Puzzle, action: () => {
      // Сохраняем позицию курсора перед открытием модального окна
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current?.contains(selection.anchorNode)) {
        savedSelectionRef.current = {
          range: selection.getRangeAt(0).cloneRange(),
          selection: selection
        };
      }
      setShowShortcodeModal(true);
    }, title: 'Шорткоды' },
  ];

  return (
    <div className="relative border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 flex flex-col" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {/* Панель инструментов - плавающая (sticky) */}
      <div className="sticky top-0 z-30 flex-shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarButtons.map((btn: any, index: number) => {
            if (btn.type === 'divider') {
              return (
                <div key={index} className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
              );
            }
            const Icon = btn.icon;
            return (
              <button
                key={index}
                ref={btn.ref}
                data-youtube-btn={btn.isYoutube ? true : undefined}
                onClick={btn.action}
                title={btn.title}
                disabled={btn.disabled}
                className={`p-2 rounded-lg transition-colors ${
                  btn.disabled 
                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
                type="button"
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Переключатель режимов */}
        <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => setMode('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'visual'
                ? 'bg-white dark:bg-slate-600 text-accent shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            type="button"
          >
            <Eye className="w-4 h-4" />
            Визуальный
          </button>
          <button
            onClick={() => setMode('html')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === 'html'
                ? 'bg-white dark:bg-slate-600 text-accent shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
            type="button"
          >
            <Code className="w-4 h-4" />
            HTML
          </button>
        </div>
      </div>

      {/* Плавающая панель для вставки ссылок и изображений */}
      {floatingToolbar.type && (
        <div 
          className="absolute z-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-4 w-80"
          style={{ 
            top: floatingToolbar.position.top, 
            left: floatingToolbar.position.left 
          }}
        >
          {/* Кнопка закрытия */}
          <button
            onClick={() => {
              savedSelectionRef.current = null;
              setFloatingToolbar({ type: null, position: { top: 0, left: 0 } });
            }}
            className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Форма вставки ссылки */}
          {floatingToolbar.type === 'link' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-4 h-4 text-accent" />
                Вставить ссылку
              </h4>
              <input
                type="text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Текст ссылки"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              />
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              />
              <button
                onClick={handleInsertLink}
                disabled={!linkUrl || linkUrl === 'https://'}
                className="w-full py-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors"
              >
                Вставить
              </button>
            </div>
          )}

          {/* Форма вставки изображения */}
          {floatingToolbar.type === 'image' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Image className="w-4 h-4 text-accent" />
                Вставить изображение
              </h4>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              />
              {imageUrl && imageUrl.startsWith('http') && (
                <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 h-24">
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}
              <button
                onClick={handleInsertImage}
                disabled={!imageUrl || !imageUrl.startsWith('http')}
                className="w-full py-2 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors"
              >
                Вставить
              </button>
            </div>
          )}

          {/* Форма вставки YouTube */}
          {floatingToolbar.type === 'youtube' && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Youtube className="w-4 h-4 text-red-500" />
                Вставить YouTube
              </h4>
              <input
                type="url"
                value={youTubeUrl}
                onChange={(e) => setYouTubeUrl(e.target.value)}
                placeholder="https://youtu.be/..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm"
              />
              <button
                onClick={handleInsertYouTube}
                disabled={!youTubeUrl}
                className="w-full py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors"
              >
                Вставить
              </button>
            </div>
          )}
        </div>
      )}

      {/* Область редактора с прокруткой */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: `${minHeight}px` }}>
      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          onInput={handleVisualInput}
          className="w-full p-4 min-h-[400px] outline-none text-slate-900 dark:text-white prose prose-slate dark:prose-invert max-w-none"
          style={{ minHeight: `${minHeight}px` }}
          data-placeholder={placeholder}
        />
      ) : (
          <textarea
            ref={textareaRef}
            value={htmlValue}
            onChange={handleHtmlChange}
            placeholder={`<p>Введите HTML код статьи...</p>

<!-- Примеры доступных тегов -->
<h2>Заголовок</h2>
<p>Текст параграфа</p>
<ul>
  <li>Элемент списка</li>
</ul>
<a href="https://example.com">Ссылка</a>
<img src="https://example.com/image.jpg" />
<blockquote>Цитата</blockquote>
<strong>Жирный текст</strong>
<em>Курсив</em>
<!-- YouTube видео (будет с отложенной загрузкой) -->
<iframe width="560" height="315" src="https://www.youtube.com/embed/VIDEO_ID"></iframe>`}
            className="w-full p-4 min-h-[400px] bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono text-sm resize-none outline-none"
            style={{ minHeight: `${minHeight}px` }}
            spellCheck={false}
          />
        )}
      </div>

      {/* Подсказки */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs text-slate-500">
        {mode === 'visual' ? (
          <span>Горячие клавиши: Ctrl+B - жирный, Ctrl+I - курсив, Ctrl+U - подчёркнутый, Ctrl+Z - отменить, Ctrl+Y - повторить, Ctrl+S - сохранить</span>
        ) : (
          <span>HTML режим: вставьте готовый HTML код или пишите вручную. Поддерживаются теги: p, h2, h3, h4, ul, ol, li, a, img, blockquote, strong, em, u, br, table, tr, td, th. CTA классы: cta-box, cta-box-calculator, cta-box-gosuslugi, cta-box-accent, cta-box-purple, cta-box-dark. Ctrl+S - сохранить</span>
        )}
      </div>

      {/* Модальное окно Google Photos */}
      {showGooglePhotosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={closeGooglePhotosModal}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Вставить из Google Photos
              </h3>
              <button
                onClick={closeGooglePhotosModal}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Mode Switcher */}
              <div className="flex gap-2">
                <button
                  onClick={() => setGooglePhotosMode('single')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    googlePhotosMode === 'single'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Одно фото
                </button>
                <button
                  onClick={() => setGooglePhotosMode('multiple')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    googlePhotosMode === 'multiple'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Несколько
                </button>
                <button
                  onClick={() => setGooglePhotosMode('album')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    googlePhotosMode === 'album'
                      ? 'bg-accent text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Альбом
                </button>
              </div>
              
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {googlePhotosMode === 'single' && 'Ссылка на фото Google Photos:'}
                  {googlePhotosMode === 'multiple' && 'Ссылки на фото (по одной на строку):'}
                  {googlePhotosMode === 'album' && 'Ссылка на альбом Google Photos:'}
                </label>
                {googlePhotosMode === 'multiple' ? (
                  <textarea
                    value={googlePhotosUrl}
                    onChange={(e) => setGooglePhotosUrl(e.target.value)}
                    placeholder="https://photos.app.goo.gl/ABC123\nhttps://photos.app.goo.gl/DEF456\nhttps://photos.app.goo.gl/GHI789"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    rows={4}
                  />
                ) : (
                  <input
                    type="url"
                    value={googlePhotosUrl}
                    onChange={(e) => setGooglePhotosUrl(e.target.value)}
                    placeholder={googlePhotosMode === 'album' 
                      ? 'https://photos.app.goo.gl/ABC123' 
                      : 'https://photos.app.goo.gl/ABC123 или https://lh3.googleusercontent.com/photo.jpg'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {googlePhotosMode === 'single' && 'Вставьте ссылку на одно фото из Google Photos (должна быть публичной)'}
                  {googlePhotosMode === 'multiple' && 'Вставьте ссылки на несколько фото (по одной на строку или через запятую)'}
                  {googlePhotosMode === 'album' && 'Вставьте ссылку на публичный альбом в Google Photos' }
                </p>
              </div>
              
              {/* Error Message */}
              {googlePhotosError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {googlePhotosError}
                </div>
              )}
              
              {/* Preview Images */}
              {googlePhotosImages.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Найдено изображений: {googlePhotosImages.length}
                      {googlePhotosSelected.size > 0 && (
                        <span className="ml-2 text-accent">
                          (выбрано: {googlePhotosSelected.size})
                        </span>
                      )}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={selectAllGooglePhotos}
                        className="text-xs text-accent hover:underline"
                      >
                        Выбрать все
                      </button>
                      <span className="text-slate-400">|</span>
                      <button
                        onClick={deselectAllGooglePhotos}
                        className="text-xs text-slate-500 hover:underline"
                      >
                        Снять выбор
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Нажмите на изображение для выбора/отмены выбора
                  </p>
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {googlePhotosImages.slice(0, 9).map((imgUrl, index) => (
                      <div 
                        key={index} 
                        className={`aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer transition-all ${
                          googlePhotosSelected.has(index) 
                            ? 'ring-2 ring-accent ring-offset-2 dark:ring-offset-slate-900' 
                            : 'hover:opacity-80'
                        }`}
                        onClick={() => toggleGooglePhotoSelection(index)}
                      >
                        <img 
                          src={imgUrl} 
                          alt={`Google Photo ${index + 1}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {googlePhotosSelected.has(index) && (
                          <div className="absolute top-1 right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                    {googlePhotosImages.length > 9 && (
                      <div className="aspect-square rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
                        +{googlePhotosImages.length - 9} ещё
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={handleGooglePhotosSearch}
                disabled={googlePhotosLoading || !googlePhotosUrl.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 font-medium rounded-xl transition-colors"
              >
                {googlePhotosLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Загрузка...
                  </>
                ) : (
                  'Найти изображения'
                )}
              </button>
              
              {googlePhotosImages.length > 0 && (
                <button
                  onClick={insertGooglePhotosImages}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  Вставить {googlePhotosSelected.size > 0 ? googlePhotosSelected.size : googlePhotosImages.length} {googlePhotosSelected.size === 1 || (googlePhotosSelected.size === 0 && googlePhotosImages.length === 1) ? 'фото' : 'фото'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для вставки ссылки */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => {
              savedSelectionRef.current = null;
              setShowLinkModal(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Link2 className="w-5 h-5 text-accent" />
                Вставить ссылку
              </h3>
              <button
                onClick={() => {
                  savedSelectionRef.current = null;
                  setShowLinkModal(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Текст ссылки */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Текст ссылки
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Введите текст ссылки"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Оставьте пустым, чтобы использовать URL как текст
                </p>
              </div>
              
              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL адрес
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setShowLinkModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleInsertLink}
                disabled={!linkUrl || linkUrl === 'https://'}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 font-medium rounded-xl transition-colors"
              >
                <Link2 className="w-4 h-4" />
                Вставить ссылку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для вставки изображения */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => {
              savedSelectionRef.current = null;
              setShowImageModal(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Image className="w-5 h-5 text-accent" />
                Вставить изображение
              </h3>
              <button
                onClick={() => {
                  savedSelectionRef.current = null;
                  setShowImageModal(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* URL изображения */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL изображения
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Введите прямую ссылку на изображение (jpg, png, gif, webp)
                </p>
              </div>
              
              {/* Preview */}
              {imageUrl && imageUrl.startsWith('http') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Предпросмотр
                  </label>
                  <div className="rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-48 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setShowImageModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleInsertImage}
                disabled={!imageUrl || !imageUrl.startsWith('http')}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 font-medium rounded-xl transition-colors"
              >
                <Image className="w-4 h-4" />
                Вставить изображение
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для вставки YouTube видео */}
      {showYouTubeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => {
              savedSelectionRef.current = null;
              setShowYouTubeModal(false);
            }}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-500" />
                Вставить YouTube видео
              </h3>
              <button
                onClick={() => {
                  savedSelectionRef.current = null;
                  setShowYouTubeModal(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body */}
            <div className="p-6 space-y-4">
              {/* URL видео */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  URL YouTube видео
                </label>
                <input
                  type="url"
                  value={youTubeUrl}
                  onChange={(e) => setYouTubeUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Поддерживаются: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
                </p>
              </div>
              
              {/* Подсказки по форматам */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Примеры поддерживаемых форматов:
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <li>• https://youtu.be/dQw4w9WgXcQ</li>
                  <li>• https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
                  <li>• https://www.youtube.com/embed/dQw4w9WgXcQ</li>
                  <li>• dQw4w9WgXcQ (прямой ID видео)</li>
                </ul>
              </div>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => setShowYouTubeModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-300 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleInsertYouTube}
                disabled={!youTubeUrl}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 font-medium rounded-xl transition-colors"
              >
                <Youtube className="w-4 h-4" />
                Вставить видео
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для выбора шорткодов */}
      {showShortcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => {
              savedSelectionRef.current = null;
              setShowShortcodeModal(false);
            }}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Puzzle className="w-5 h-5 text-accent" />
                Вставить элемент
              </h3>
              <button
                onClick={() => {
                  savedSelectionRef.current = null;
                  setShowShortcodeModal(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
              <div className="flex flex-wrap gap-2 mb-4">
                {shortcodeCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedShortcodeCategory(category)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedShortcodeCategory === category
                        ? 'bg-accent text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {shortcodes
                  .filter(s => s.category === selectedShortcodeCategory)
                  .map(shortcode => (
                    <button
                      key={shortcode.id}
                      onClick={() => insertShortcode(shortcode)}
                      className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800 hover:bg-accent/10 dark:hover:bg-accent/20 rounded-xl transition-colors text-left group"
                    >
                      <span className="text-2xl">{shortcode.icon}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-accent">
                        {shortcode.name}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500">
                Нажмите на элемент для вставки в позицию курсора
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для документов */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => {
              savedSelectionRef.current = null;
              setShowDocumentModal(false);
            }}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                Документы и шаблоны
              </h3>
              <button
                onClick={() => {
                  savedSelectionRef.current = null;
                  setShowDocumentModal(false);
                }}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
              {/* Загрузка нового документа */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Загрузить новый документ</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    placeholder="Название документа"
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                  <div className="flex gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      <Upload className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-600 dark:text-slate-300">
                        {documentFile ? documentFile.name : 'Выбрать файл'}
                      </span>
                      <input
                        type="file"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.rtf"
                      />
                    </label>
                    <button
                      onClick={handleDocumentUpload}
                      disabled={!documentFile || !documentTitle.trim() || documentUploading}
                      className="px-4 py-2.5 bg-accent hover:bg-accent-light disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white disabled:text-slate-500 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      {documentUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      Загрузить
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Поддерживаемые форматы: PDF, DOC, DOCX, TXT, RTF
                  </p>
                </div>
              </div>

              {/* Список загруженных документов */}
              {uploadedDocuments.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Загруженные документы</h4>
                  <div className="space-y-2">
                    {uploadedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-md transition-shadow cursor-pointer group"
                        onClick={() => insertDocument(doc)}
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.name}</p>
                          <p className="text-xs text-slate-500">Документ</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a
                            href={doc.url}
                            download={doc.name}
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="Скачать"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(doc.url);
                              alert('Ссылка скопирована!');
                            }}
                            className="p-2 text-slate-500 hover:text-green-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            title="Копировать ссылку"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Быстрые шаблоны */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Быстрые шаблоны</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { name: 'Договор аренды', icon: '🏠' },
                    { name: 'Договор купли-продажи', icon: '💰' },
                    { name: 'Трудовой договор', icon: '👔' },
                    { name: 'Исковое заявление', icon: '⚖️' },
                    { name: 'Доверенность', icon: '📜' },
                    { name: 'Расписка', icon: '✍️' },
                  ].map((template) => (
                    <button
                      key={template.name}
                      onClick={() => {
                        const templateHtml = `<div class="document-template" style="display: flex; align-items: center; gap: 12px; padding: 16px; background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border: 1px solid #bae6fd; border-radius: 12px; margin: 16px 0;">
                          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px;">${template.icon}</div>
                          <div style="flex: 1;">
                            <p style="font-weight: 600; color: #0c4a6e; margin: 0; font-size: 14px;">${template.name}</p>
                            <p style="color: #0369a1; margin: 4px 0 0; font-size: 12;">Шаблон документа</p>
                          </div>
                          <span style="color: #0ea5e9;">+</span>
                        </div>`;
                        insertAtCursor(templateHtml);
                        setShowDocumentModal(false);
                      }}
                      className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors text-left"
                    >
                      <span className="text-xl">{template.icon}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{template.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <p className="text-xs text-slate-500">
                Нажмите на документ для вставки в статью
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default React.memo(HtmlEditorComponent);
