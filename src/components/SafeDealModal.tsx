import React, { useState } from 'react';
import { safeDeals } from '../lib/chat-api';

interface SafeDealModalProps {
  chatId: string;
  userId: string;
  lawyerId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SafeDealModal: React.FC<SafeDealModalProps> = ({
  chatId,
  userId,
  lawyerId,
  onClose,
  onSuccess,
}) => {
  const [serviceType, setServiceType] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [deadlineDays, setDeadlineDays] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceType || !amount) return;

    setLoading(true);
    
    const dealData = {
      chat_id: chatId,
      user_id: userId,
      lawyer_id: lawyerId,
      service_type: serviceType,
      service_description: serviceDescription,
      amount: parseFloat(amount),
      deadline_days: deadlineDays ? parseInt(deadlineDays) : null,
    };

    const { data, error } = await safeDeals.create(dealData);
    setLoading(false);

    if (data) {
      onClose();
      if (onSuccess) onSuccess();
    } else if (error) {
      console.error('Error creating deal:', error);
    }
  };

  return (
    <div className="safe-deal-modal">
      <div className="modal-overlay" onClick={onClose}></div>
      <div className="modal-content">
        <div className="modal-header">
          <h2>Создание безопасной сделки</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Тип услуги *</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              required
            >
              <option value="">Выберите тип услуги</option>
              <option value="Гражданское дело">Гражданское дело</option>
              <option value="Административное дело">Административное дело</option>
              <option value="Семейное дело">Семейное дело</option>
              <option value="Уголовное дело">Уголовное дело</option>
              <option value="Трудовое дело">Трудовое дело</option>
              <option value="Жилищный спор">Жилищный спор</option>
              <option value="Наследственное дело">Наследственное дело</option>
              <option value="Другое">Другое</option>
            </select>
          </div>

          <div className="form-group">
            <label>Описание услуги</label>
            <textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}
              placeholder="Детальное описание того, что нужно сделать..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Стоимость (руб.) *</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Срок исполнения (дней)</label>
            <input
              type="number"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              placeholder="30"
              min="1"
            />
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading || !serviceType || !amount}>
              {loading ? 'Создание...' : 'Создать сделку'}
            </button>
            <button type="button" onClick={onClose} className="cancel-button">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SafeDealModal;