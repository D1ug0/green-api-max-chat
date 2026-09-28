import { isRecord } from '@/shared/lib';
import type { ChatInfo, Message, MessageStatus } from './types';

export function parseStatus(value: unknown): MessageStatus | undefined {
  return typeof value === 'string' && ['sent', 'delivered', 'read', 'failed'].includes(value)
    ? (value as MessageStatus)
    : undefined;
}
function readText(data: Record<string, unknown>): string | null {
  if (
    data.typeMessage === 'textMessage' &&
    isRecord(data.textMessageData) &&
    typeof data.textMessageData.textMessage === 'string'
  )
    return data.textMessageData.textMessage;
  if (
    data.typeMessage === 'extendedTextMessage' &&
    isRecord(data.extendedTextMessageData) &&
    typeof data.extendedTextMessageData.text === 'string'
  )
    return data.extendedTextMessageData.text;
  return null;
}
export function parseIncoming(value: unknown): { chat: ChatInfo; message: Message } | null {
  if (
    !isRecord(value) ||
    !['incomingMessageReceived', 'outgoingAPIMessageReceived', 'outgoingMessageReceived'].includes(
      String(value.typeWebhook),
    )
  )
    return null;
  if (
    typeof value.idMessage !== 'string' ||
    !value.idMessage ||
    typeof value.timestamp !== 'number' ||
    !Number.isFinite(value.timestamp)
  )
    return null;
  const sender = value.senderData;
  if (
    !isRecord(sender) ||
    typeof sender.chatId !== 'string' ||
    sender.chatId.startsWith('-') ||
    (sender.chatType && sender.chatType !== 'user')
  )
    return null;
  if (!isRecord(value.messageData)) return null;
  const text = readText(value.messageData);
  if (text === null) return null;
  const phone =
    typeof sender.senderPhoneNumber === 'number' && sender.senderPhoneNumber > 0
      ? String(sender.senderPhoneNumber)
      : undefined;
  const outgoing = value.typeWebhook !== 'incomingMessageReceived';
  return {
    chat: {
      id: sender.chatId,
      phone,
      title:
        typeof sender.chatName === 'string' && sender.chatName.trim()
          ? sender.chatName
          : phone
            ? `+${phone}`
            : `Чат ${sender.chatId}`,
    },
    message: {
      id: value.idMessage,
      text,
      timestamp: value.timestamp * 1000,
      direction: outgoing ? 'outgoing' : 'incoming',
      status: outgoing ? 'sent' : undefined,
    },
  };
}
export function parseHistory(value: unknown): Message | null {
  if (
    !isRecord(value) ||
    typeof value.idMessage !== 'string' ||
    typeof value.timestamp !== 'number' ||
    !Number.isFinite(value.timestamp)
  )
    return null;
  if (
    !['textMessage', 'extendedTextMessage'].includes(String(value.typeMessage)) ||
    !['incoming', 'outgoing'].includes(String(value.type))
  )
    return null;
  const text =
    typeof value.textMessage === 'string'
      ? value.textMessage
      : isRecord(value.extendedTextMessage) && typeof value.extendedTextMessage.text === 'string'
        ? value.extendedTextMessage.text
        : null;
  if (text === null) return null;
  return {
    id: value.idMessage,
    text,
    direction: value.type as Message['direction'],
    timestamp: value.timestamp * 1000,
    status: value.type === 'outgoing' ? (parseStatus(value.statusMessage) ?? 'sent') : undefined,
  };
}
