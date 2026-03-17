import React from 'react';

interface SafeDealCardProps {
  deal: {
    id: string;
    service_type: string;
    service_description: string;
    amount: number;
    status: string;
    deadline_days?: number;
    created_at: string;
  };
}

export const SafeDealCard: React.FC<SafeDealCardProps> = ({ deal }) => {
  const getStatusColor = () => {
    switch (deal.status) {
      case 'pending':
        return '#ff9800';
      case 'confirmed':
        return '#2196f3';
      case 'paid':
        return '#4caf50';
      case 'completed':
        return '#8bc34a';
      case 'disputed':
        return '#e53935';
      case 'refunded':
        return '#9e9e9e';
      case 'cancelled':
        return '#9e9e9e';
      default:
        return '#666';
    }
  };

  const getStatusText = () => {
    switch (deal.status) {
      case 'pending':
        return 'Ожидание оплаты';
      case 'confirmed':
        return 'Подтверждено';
      case 'paid':
        return 'Оплачено';
      case 'completed':
        return 'Завершено';
      case 'disputed':
        return 'Спор';
      case 'refunded':
        return 'Возврат';
      case 'cancelled':
        return 'Отменено';
      default:
        return deal.status;
    }
  };

  const getDeadlineInfo = () => {
    if (!deal.deadline_days) return null;
    const createdAt = new Date(deal.created_at);
    const deadline = new Date(createdAt);
    deadline.setDate(deadline.getDate() + deal.deadline_days);
    const daysLeft = Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0) {
      return <span className="deadline-info">Срок: {daysLeft} дн.</span>;
    } else if (daysLeft === 0) {
      return <span className="deadline-info deadline-today">Срок сегодня</span>;
    } else {
      return <span className="deadline-info deadline-overdue">Срок просрочен</span>;
    }
  };

  return (
    <div className="safe-deal-card">
      <div className="deal-header">
        <h4>Безопасная сделка</h4>
        <span className="deal-status" style={{ backgroundColor: getStatusColor() }}>
          {getStatusText()}
        </span>
      </div>

      <div className="deal-content">
        <div className="deal-info">
          <p className="service-type"><strong>Услуга:</strong> {deal.service_type}</p>
          <p className="service-description">{deal.service_description || 'Нет описания'}</p>
          <p className="amount"><strong>Стоимость:</strong> {deal.amount.toLocaleString()} ₽</p>
          {getDeadlineInfo()}
        </div>

        <div className="deal-actions">
          {deal.status === 'pending' && (
            <button className="action-button pay-button">Оплатить</button>
          )}
          {deal.status === 'paid' && (
            <button className="action-button confirm-button">Подтвердить</button>
          )}
          {deal.status === 'completed' && (
            <button className="action-button review-button">Оставить отзыв</button>
          )}
          {deal.status === 'disputed' && (
            <button className="action-button dispute-button">Открыть спор</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SafeDealCard;