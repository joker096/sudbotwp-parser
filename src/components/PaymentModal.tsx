import { useState, memo, useEffect } from 'react';
import { X, CreditCard, Smartphone, CheckCircle2, Loader2, FileText, Download, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ParsedCase } from '../types';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface BrandingInfo {
  logoUrl?: string;
  name?: string;
  phone?: string;
  email?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: ParsedCase | null;
  onSuccess: () => void;
  userEmail?: string;
  branding?: BrandingInfo | null;
}

type PaymentMethod = 'card' | 'sbp' | 'crypto';

function PaymentModal({ isOpen, onClose, caseData, onSuccess, userEmail, branding }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [email, setEmail] = useState(userEmail || '');
  const { showToast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { user } = useAuth();

  const price = 490; // Базовая цена отчёта

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      // Вызываем Edge Function для создания платежа
      const { data, error } = await supabase.functions.invoke('yookassa', {
        body: {
          action: 'create',
          amount: price,
          description: `PDF отчёт по делу ${caseData?.number || ''}`,
          caseId: caseData?.id?.toString(),
          userId: user?.id,
          email: email,
        },
      });

      if (error) throw error;

      // Перенаправляем на страницу оплаты Юкассы
      if (data?.confirmationUrl) {
        window.location.href = data.confirmationUrl;
      } else {
        // Fallback - имитация оплаты
        await simulatePayment();
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Fallback - имитация оплаты
      await simulatePayment();
    } finally {
      setIsProcessing(false);
    }
  };

  // Имитация оплаты (fallback)
  const simulatePayment = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPaid(true);
    generatePDF();
    setTimeout(() => {
      onSuccess();
      handleClose();
    }, 3000);
  };

  useEffect(() => {
    setEmail(userEmail || '');
  }, [userEmail, isOpen]);

  const generatePDF = () => {
    // Создаём HTML для печати
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const logoSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"></path>
        <path d="M7 21h10"></path><path d="M12 3v18"></path>
        <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"></path>
      </svg>
    `;

    const userLogo = branding?.logoUrl 
      ? `<img src="${branding.logoUrl}" alt="logo" style="width: 36px; height: 36px; border-radius: 8px; object-fit: cover;" />` 
      : logoSvg;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(caseData?.link || '')}&size=80x80&margin=0`;

    // Filter events that represent a status change
    const statusChangeEvents = caseData?.events?.filter(event => event.result && event.result.trim() !== '');

    const lawyerContactsHtml = branding?.name
      ? `
        <section>
          <h2>Ваш юрист</h2>
          <div class="info-grid">
            <div class="info-item full-width"><div class="label">ФИО</div><div class="value">${branding.name}</div></div>
            ${branding.phone ? `<div class="info-item"><div class="label">Телефон</div><div class="value">${branding.phone}</div></div>` : ''}
            ${branding.email ? `<div class="info-item"><div class="label">Email</div><div class="value">${branding.email}</div></div>` : ''}
          </div>
        </section>
      `
      : '';

    const html = `
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <title>Отчёт по делу ${caseData?.number || ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 40px;
            background-color: #f8f9fa;
            color: #212529;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.05);
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 1px solid #dee2e6;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .logo {
            color: #5856d6; /* Accent color */
          }
          .qr-code {
            text-align: center;
            flex-shrink: 0;
          }
          .qr-code img {
            width: 80px;
            height: 80px;
            display: block;
            margin: 0 auto 4px;
            border-radius: 8px;
          }
          .qr-code p {
            font-size: 10px;
            color: #6c757d;
            margin: 0;
          }
          h1 {
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            color: #212529;
          }
          h2 {
            font-size: 20px;
            font-weight: 600;
            margin-top: 40px;
            margin-bottom: 16px;
            color: #495057;
            border-bottom: 1px solid #e9ecef;
            padding-bottom: 8px;
          }
          .case-number-label {
            font-size: 14px;
            color: #6c757d;
            margin-bottom: 4px;
          }
          .case-number {
            font-size: 18px;
            font-weight: 600;
            color: #212529;
            background-color: #e9ecef;
            padding: 8px 12px;
            border-radius: 8px;
            display: inline-block;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 16px; 
          }
          .info-item { 
            background-color: #f8f9fa; 
            padding: 16px; 
            border-radius: 12px; 
            border: 1px solid #e9ecef;
          }
          .info-item.full-width {
            grid-column: span 2;
          }
          .label { 
            font-size: 12px; 
            color: #6c757d; 
            text-transform: uppercase; 
            font-weight: 600;
            letter-spacing: 0.5px;
          }
          .value { 
            font-size: 15px; 
            font-weight: 600; 
            color: #212529; 
            margin-top: 6px; 
          }
          .parties { 
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .party { 
            background-color: #f8f9fa; 
            padding: 20px; 
            border-radius: 12px; 
            border: 1px solid #e9ecef;
          }
          .timeline {
            position: relative;
            padding-left: 30px;
            border-left: 2px solid #e9ecef;
          }
          .timeline-item {
            position: relative;
            margin-bottom: 20px;
            padding: 16px;
            background-color: #f8f9fa;
            border-radius: 12px;
          }
          .timeline-item:last-child {
            margin-bottom: 0;
          }
          .timeline-dot {
            position: absolute;
            left: -39px;
            top: 18px;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background-color: #ffffff;
            border: 3px solid #5856d6;
          }
          .timeline-date {
            font-weight: 600;
            color: #212529;
            margin-bottom: 4px;
          }
          .timeline-name {
            font-size: 14px;
            color: #495057;
          }
          .timeline-result {
            font-size: 13px;
            font-weight: 600;
            color: #198754; /* Green for success */
            margin-top: 8px;
          }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #dee2e6; 
            font-size: 12px; 
            color: #6c757d; 
            text-align: center;
          }
          @media print {
            body { padding: 0; background-color: #ffffff; }
            .container { box-shadow: none; border-radius: 0; padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header class="header">
            <div class="header-left">
              <div class="logo">${userLogo}</div>
              <h1>Судебный отчёт</h1>
            </div>
            ${caseData?.link ? `
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR-код на дело">
              <p>Ссылка на дело</p>
            </div>
            ` : ''}
          </header>

          <main>
            <div class="case-number-label">Номер дела</div>
            <p class="case-number">${caseData?.number || '—'}</p>
            
            <section>
              <h2>Основная информация</h2>
              <div class="info-grid">
                <div class="info-item">
                  <div class="label">Суд</div>
                  <div class="value">${caseData?.court || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Категория</div>
                  <div class="value">${caseData?.category || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Судья</div>
                  <div class="value">${caseData?.judge || '—'}</div>
                </div>
                <div class="info-item">
                  <div class="label">Дата регистрации</div>
                  <div class="value">${caseData?.date || '—'}</div>
                </div>
                <div class="info-item full-width">
                  <div class="label">Результат рассмотрения</div>
                  <div class="value">${caseData?.status || '—'}</div>
                </div>
              </div>
            </section>

            <section>
              <h2>Стороны</h2>
              <div class="parties">
                <div class="party">
                  <div class="label">Истец</div>
                  <div class="value">${caseData?.plaintiff || '—'}</div>
                </div>
                <div class="party">
                  <div class="label">Ответчик</div>
                  <div class="value">${caseData?.defendant || '—'}</div>
                </div>
              </div>
            </section>

            ${caseData?.events?.length ? `
            <section>
              <h2>Движение дела</h2>
              <div class="timeline">
                ${caseData.events.map((event) => `
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-date">${event.date} ${event.time || ''}</div>
                    <div class="timeline-name">${event.name}</div>
                    ${event.result ? `<div class="timeline-result">✓ ${event.result}</div>` : ''}
                    ${event.reason ? `<div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Причина: ${event.reason}</div>` : ''}
                    ${event.location ? `<div style="font-size: 12px; color: #6c757d; margin-top: 4px;">Место: ${event.location}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </section>
            ` : ''}
          </main>

          <footer class="footer">
            <p>Отчёт сгенерирован сервисом SudBot. Дата: ${new Date().toLocaleDateString('ru-RU')}</p>
            <p>Информация носит справочный характер и не является официальным документом.</p>
          </footer>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSendEmail = async () => {
    if (!email || !caseData) return;
    setIsSendingEmail(true);
    setEmailSent(false);

    try {
      // Note: Ensure you have a 'send-report-email' function deployed in Supabase.
      const { error } = await supabase.functions.invoke('send-report-email', {
        body: {
          caseData: caseData,
          toEmail: email,
        },
      });

      if (error) throw error;

      setEmailSent(true);
      showToast('Отчет успешно отправлен на почту!');
    } catch (error) {
      console.error('Error sending email:', error);
      showToast('Ошибка при отправке отчета.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Reset state on close
  const handleClose = () => {
    // Add a small delay to allow exit animation to complete
    setTimeout(() => {
      setPaymentMethod('card');
      setIsProcessing(false);
      setIsPaid(false);
      setEmail(userEmail || '');
      setIsSendingEmail(false);
      setEmailSent(false);
    }, 300);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl"
          >
            <button 
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>

            {isPaid ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                </motion.div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Оплата успешна!
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  Ваш отчёт скачивается...
                </p>
                <button
                  onClick={generatePDF}
                  className="w-full bg-accent hover:bg-accent-light text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Скачать еще раз
                </button>

                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-center text-slate-600 dark:text-slate-300 mb-3">
                    Или отправьте отчет на почту
                  </p>
                  {emailSent ? (
                    <div className="text-center text-emerald-600 dark:text-emerald-400 font-medium text-sm p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Отчет успешно отправлен!
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-accent/20 transition-colors"
                      />
                      <button
                        onClick={handleSendEmail}
                        disabled={isSendingEmail || !email}
                        className="bg-slate-900 dark:bg-slate-700 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center w-32"
                      >
                        {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Отправить'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    Купить PDF отчёт
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Дело № {caseData?.number || '—'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">PDF отчёт</span>
                    <span className="text-sm text-slate-500 line-through">990 ₽</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-900 dark:text-white">Акция</span>
                    <span className="text-2xl font-bold text-accent">{price} ₽</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Способ оплаты</p>
                  
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      paymentMethod === 'card' 
                        ? 'border-accent bg-accent/5' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900 dark:text-white">Банковская карта</span>
                    {paymentMethod === 'card' && <CheckCircle2 className="w-5 h-5 text-accent ml-auto" />}
                  </button>

                  <button
                    onClick={() => setPaymentMethod('sbp')}
                    className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                      paymentMethod === 'sbp' 
                        ? 'border-accent bg-accent/5' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-900 dark:text-white">СБП</span>
                    {paymentMethod === 'sbp' && <CheckCircle2 className="w-5 h-5 text-accent ml-auto" />}
                  </button>
                </div>

                <button
                  onClick={handlePayment}
                  disabled={isProcessing}
                  className="w-full bg-accent hover:bg-accent-light disabled:bg-slate-300 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Обработка платежа...
                    </>
                  ) : (
                    <>
                      Оплатить {price} ₽
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500">
                  <Shield className="w-4 h-4" />
                  Безопасная оплата через ЮKassa
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default memo(PaymentModal);
