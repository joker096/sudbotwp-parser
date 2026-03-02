import { useEffect } from 'react';
import { Shield, Lock, Eye, User, Database, Bell, Mail, ChevronDown } from 'lucide-react';
import { useSeo } from '../hooks/useSeo';

export default function Privacy() {
  const { setSeo } = useSeo('/privacy');

  // Установка SEO мета тегов для страницы политики конфиденциальности
  useEffect(() => {
    setSeo({
      title: 'Политика конфиденциальности - Sud',
      description: 'Политика обработки персональных данных на платформе Sud. Узнайте, как мы защищаем и обрабатываем ваши данные.',
      keywords: 'политика конфиденциальности, персональные данные, обработка данных, 152-ФЗ, GDPR',
      ogTitle: 'Политика конфиденциальности - Sud',
      ogDescription: 'Узнайте, как мы защищаем и обрабатываем ваши персональные данные.',
    });
  }, [setSeo]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-accent/10 rounded-3xl mb-4">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          Политика конфиденциальности
        </h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
          Политика обработки персональных данных на платформе Sud
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
          Дата последнего обновления: 23 февраля 2026 г.
        </p>
      </div>

      {/* Введение */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей (далее — «Пользователи», «Вы») сервиса Sud (далее — «Сервис», «Платформа», «Мы»). Мы обязуемся защищать Вашу конфиденциальность и обеспечивать безопасность Ваших персональных данных.
        </p>
      </div>

      {/* Разделы */}
      <div className="space-y-4">
        <Section title="1. Общие положения" icon={User}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            1.1. Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» (далее — 152-ФЗ), а также иными нормативными правовыми актами Российской Федерации в области защиты и обработки персональных данных.
          </p>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            1.2. Используя Сервис, Вы соглашаетесь с условиями настоящей Политики. Если Вы не согласны с условиями Политики, пожалуйста, не используйте Сервис.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            1.3. Оператором персональных данных является ИП (или ООО) — владелец платформы Sud, ОГРН: [указать], ИНН: [указать], адрес: [указать адрес].
          </p>
        </Section>

        <Section title="2. Какие данные мы собираем" icon={Database}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Мы собираем следующие категории персональных данных:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li><strong>Данные аккаунта:</strong> имя, фамилия, электронная почта, номер телефона, фотография профиля;</li>
            <li><strong>Данные аутентификации:</strong> данные аккаунтов социальных сетей (при авторизации через Google);</li>
            <li><strong>Данные о юридической деятельности:</strong> информация о специализации, опыте, образовании, рейтинге (для юристов);</li>
            <li><strong>Данные о делах:</strong> номера дел, информация о судебных процессах, комментарии и заметки;</li>
            <li><strong>Технические данные:</strong> IP-адрес, тип браузера, устройства, файлы cookie, данные о использовании Сервиса;</li>
            <li><strong>Финансовые данные:</strong> информация о платежах, история транзакций (обрабатываются через платёжные системы).</li>
          </ul>
        </Section>

        <Section title="3. Цели обработки персональных данных" icon={Eye}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Мы обрабатываем Ваши персональные данные для следующих целей:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>Предоставление доступа к Сервису и его функциональным возможностям;</li>
            <li>Регистрация и аутентификация пользователей;</li>
            <li>Подбор и рекомендация юристов на основе Ваших запросов;</li>
            <li>Обработка заявок и запросов пользователей;</li>
            <li>Обеспечение мониторинга судебных дел и уведомлений;</li>
            <li>Обработка платежей и финансовых операций;</li>
            <li>Улучшение качества Сервиса и разработка новых функций;</li>
            <li>Отправка уведомлений, сообщений и рассылок (с Вашего согласия);</li>
            <li>Соблюдение требований законодательства.</li>
          </ul>
        </Section>

        <Section title="4. Правовые основания обработки" icon={Lock}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Обработка персональных данных осуществляется на следующих правовых основаниях:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li><strong>Согласие субъекта персональных данных</strong> — ст. 6 ч. 1 п. 1 152-ФЗ;</li>
            <li><strong>Исполнение договора</strong> — ст. 6 ч. 1 п. 5 152-ФЗ (договорные обязательства);</li>
            <li><strong>Защита жизни и здоровья</strong> — ст. 6 ч. 1 п. 6 152-ФЗ (если обработка необходима для защиты жизни);</li>
            <li><strong>Исполнение требований законодательства</strong> — ст. 6 ч. 1 п. 2 152-ФЗ.</li>
          </ul>
        </Section>

        <Section title="5. Передача данных третьим лицам" icon={Mail}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            5.1. Мы не передаём Ваши персональные данные третьим лицам, за исключением следующих случаев:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>При Вашем явном согласии на передачу данных;</li>
            <li>Юристам, которым Вы направили запрос или заявку (контактные данные);</li>
            <li>Платёжным системам для обработки платежей;</li>
            <li>Провайдерам хостинга и облачных услуг (Supabase и др.);</li>
            <li>В соответствии с требованиями законодательства (по запросу госорганов).</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            5.2. При передаче данных мы обеспечиваем конфиденциальность и требуем от третьих лиц соблюдения настоящей Политики.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            5.3. Ваши данные могут храниться на серверах, расположенных за пределами Российской Федерации (в облаке Supabase). При этом мы обеспечиваем соответствие требованиям законодательства о локализации данных.
          </p>
        </Section>

        <Section title="6. Защита данных" icon={Shield}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            6.1. Мы применяем комплекс технических и организационных мер для защиты Ваших персональных данных:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>Шифрование данных при передаче (TLS/SSL);</li>
            <li>Защищённые базы данных с контролем доступа;</li>
            <li>Регулярное обновление систем безопасности;</li>
            <li>Ограничение доступа к персональным данным;</li>
            <li>Обучение персонала правилам обработки данных;</li>
            <li>Регулярный аудит безопасности.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300">
            6.2. Несмотря на принимаемые меры, мы не можем гарантировать абсолютную безопасность данных. Вы также должны соблюдать меры предосторожности при использовании Сервиса.
          </p>
        </Section>

        <Section title="7. Cookies и аналогичные технологии" icon={Bell}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            7.1. Мы используем файлы cookie и аналогичные технологии для:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>Аутентификации и сохранения сессии;</li>
            <li>Анализа использования Сервиса и улучшения функциональности;</li>
            <li>Персонализации контента и рекламы;</li>
            <li>Обеспечения безопасности.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            7.2. Вы можете отключить cookies в настройках браузера, но это может повлиять на работоспособность Сервиса.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            7.3. Подробнее об использовании cookies описано в нашей Политике использования файлов cookie.
          </p>
        </Section>

        <Section title="8. Права пользователей" icon={User}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Вы имеете следующие права в отношении Ваших персональных данных:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li><strong>Право на доступ</strong> — получить информацию о том, какие данные мы обрабатываем;</li>
            <li><strong>Право на исправление</strong> — потребовать исправления неточных данных;</li>
            <li><strong>Право на удаление</strong> — потребовать удаления данных (право на забвение);</li>
            <li><strong>Право на ограничение обработки</strong> — ограничить обработку данных;</li>
            <li><strong>Право на перенос данных</strong> — получить данные в структурированном виде;</li>
            <li><strong>Право на отзыв согласия</strong> — отозвать согласие на обработку данных в любое время;</li>
            <li><strong>Право на возражение</strong> — возражать против обработки данных;</li>
            <li><strong>Право на жалобу</strong> — подать жалобу в Роскомнадзор.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300">
            Для реализации прав направьте запрос на электронную почту: support@cvr.name
          </p>
        </Section>

        <Section title="9. Срок хранения данных" icon={Database}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            9.1. Мы храним Ваши персональные данные в течение срока, необходимого для достижения целей обработки:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>Данные аккаунта — в течение срока действия аккаунта и 3 лет после его удаления;</li>
            <li>Данные о делах — в течение 5 лет после последней активности;</li>
            <li>Финансовые данные — в течение 5 лет (в соответствии с требованиями законодательства о бухгалтерском учёте);</li>
            <li>Технические данные — до 12 месяцев с момента сбора.</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300">
            9.2. По истечении срока хранения данные удаляются или обезличиваются.
          </p>
        </Section>

        <Section title="10. Изменения в Политике" icon={ChevronDown}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            10.1. Мы оставляем за собой право вносить изменения в настоящую Политику. Изданияния вступают в силу с момента их публикации на Сервере.
          </p>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            10.2. Мы уведомим Вас о существенных изменениях Политики через Сервис или по электронной почте.
          </p>
          <p className="text-slate-600 dark:text-slate-300">
            10.3. Продолжая использовать Сервис после изменений, Вы соглашаетесь с обновлённой Политикой.
          </p>
        </Section>

        <Section title="11. Контакты" icon={Mail}>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            Если у Вас есть вопросы о настоящей Политике или Вы хотите реализовать свои права, свяжитесь с нами:
          </p>
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 mb-4">
            <li>Email: support@cvr.name</li>
            <li>Telegram: @cvrname</li>
          </ul>
          <p className="text-slate-600 dark:text-slate-300">
            По вопросам защиты персональных данных: dpo@cvr.name
          </p>
        </Section>
      </div>

      {/* Дополнительная информация */}
      <div className="bg-gradient-to-br from-accent/5 to-primary/5 dark:from-accent/10 dark:to-primary/10 rounded-2xl p-6 border border-accent/20">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Законодательство
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Обработка персональных данных осуществляется в соответствии с:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
          <li>Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»;</li>
          <li>Постановлением Правительства РФ от 01.11.2012 № 1119 «Об утверждении требований к защите персональных данных»;</li>
          <li>Приказом ФСТЭК России от 18.02.2013 № 21 «Об утверждении состава и содержания организационных и технических мер»;</li>
          <li>GDPR (Регламент ЕС 2016/679) — для пользователей из ЕС.</li>
        </ul>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50">
        <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-accent" />
        </div>
        <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <div className="p-5 pt-4">
        {children}
      </div>
    </div>
  );
}
