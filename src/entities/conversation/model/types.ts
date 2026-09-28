export type MessageStatus =
  'sending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'uncertain';
export interface Message {
  id: string;
  clientId?: string;
  text: string;
  direction: 'incoming' | 'outgoing';
  timestamp: number;
  status?: MessageStatus;
  error?: string;
}
export interface ChatInfo {
  id: string;
  title: string;
  phone?: string;
}
export interface Conversation extends ChatInfo {
  messages: Message[];
  unread: number;
  history: 'idle' | 'loading' | 'loaded' | 'error';
  historyError?: string;
}
