import CounterpartyDashboard from '../components/CounterpartyDashboard';
import { useSeo } from '../hooks/useSeo';
import { useEffect } from 'react';

export default function CounterpartyPage() {
  const { setSeo } = useSeo('/counterparty');

  useEffect(() => {
    setSeo({
      title: 'Проверка контрагента — Sud',
      description: 'Проверьте компанию или ИП по ИНН через ЕГРЮЛ, ФССП, ЕФРСБ. Риск-скоринг, банкротство, исполнительные производства.',
      keywords: 'проверка контрагента, ЕГРЮЛ, ФССП, банкротство, ИНН, риск-скоринг',
      ogTitle: 'Проверка контрагента — Sud',
      ogDescription: 'Бесплатная проверка компаний и ИП по ИНН',
    });
  }, [setSeo]);

  return <CounterpartyDashboard />;
}
