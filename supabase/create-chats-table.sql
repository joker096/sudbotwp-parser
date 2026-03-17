-- Удаляем старые таблицы если они есть (для чистой установки)
DROP TABLE IF EXISTS deal_disputes CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS safe_deals CASCADE;
DROP TABLE IF EXISTS chats CASCADE;

-- Создаём таблицу chats
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  unread_user_count INT DEFAULT 0,
  unread_lawyer_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lawyer_id)
);

-- Создаём таблицу chat_messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаём таблицу safe_deals
CREATE TABLE safe_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL,
  user_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  
  service_type VARCHAR(50) NOT NULL,
  service_description TEXT,
  amount DECIMAL(12,2) NOT NULL,
  deadline_days INT,
  
  status VARCHAR(30) DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  
  escrow_payment_id TEXT,
  escrow_status VARCHAR(20) DEFAULT 'holding',
  
  user_confirmed BOOLEAN DEFAULT FALSE,
  lawyer_confirmed BOOLEAN DEFAULT FALSE,
  user_confirmed_at TIMESTAMPTZ,
  lawyer_confirmed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Создаём таблицу deal_disputes
CREATE TABLE deal_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  user_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  
  dispute_reason TEXT NOT NULL,
  dispute_description TEXT,
  dispute_status VARCHAR(20) DEFAULT 'open',
  
  arbitrator_id UUID,
  arbitrator_decision TEXT,
  arbitrator_decision_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_lawyer_id ON chats(lawyer_id);
CREATE INDEX idx_chats_status ON chats(status);
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_safe_deals_chat_id ON safe_deals(chat_id);
CREATE INDEX idx_safe_deals_user_id ON safe_deals(user_id);
CREATE INDEX idx_safe_deals_lawyer_id ON safe_deals(lawyer_id);
CREATE INDEX idx_safe_deals_status ON safe_deals(status);
CREATE INDEX idx_deal_disputes_deal_id ON deal_disputes(deal_id);
CREATE INDEX idx_deal_disputes_status ON deal_disputes(dispute_status);