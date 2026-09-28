import { delay } from '@/shared/lib';
import type { GreenApi, Receipt } from './types';

export function createDemoApi(): GreenApi {
  const history: Record<string, unknown[]> = {};
  const chats: { chatId: string; name: string; type: string; phoneNumber: number }[] = [];
  let receiptId = 0;
  const queue: (Receipt & { at: number })[] = [];
  return {
    getState: async () => 'authorized',
    getSettings: async () => ({
      typeInstance: 'v3',
      webhookUrl: '',
      incomingWebhook: 'yes',
      outgoingWebhook: 'yes',
      outgoingMessageWebhook: 'yes',
      outgoingAPIMessageWebhook: 'yes',
    }),
    async getHistory(chatId, signal) {
      await delay(200, signal);
      return [...(history[chatId] ?? [])];
    },
    async checkAccount(phone, signal) {
      await delay(400, signal);
      const chatId = `demo-${phone}`;
      if (!chats.some((chat) => chat.chatId === chatId))
        chats.push({ chatId, name: `+${phone}`, type: 'user', phoneNumber: Number(phone) });
      return chatId;
    },
    async sendMessage(chatId, text, signal) {
      await delay(350, signal);
      const id = crypto.randomUUID();
      const timestamp = Math.floor(Date.now() / 1000);
      (history[chatId] ??= []).push({
        idMessage: id,
        chatId,
        type: 'outgoing',
        typeMessage: 'textMessage',
        textMessage: text,
        timestamp,
        statusMessage: 'read',
      });
      const reply = {
        idMessage: crypto.randomUUID(),
        chatId,
        type: 'incoming',
        typeMessage: 'textMessage',
        textMessage:
          'Сообщение получено! Это автоматический ответ деморежима. В подключённом аккаунте здесь будет ответ собеседника из MAX.',
        timestamp: timestamp + 1,
      };
      history[chatId].push(reply);
      queue.push({
        receiptId: ++receiptId,
        at: Date.now() + 500,
        body: { typeWebhook: 'outgoingMessageStatus', chatId, idMessage: id, status: 'read' },
      });
      queue.push({
        receiptId: ++receiptId,
        at: Date.now() + 1200,
        body: {
          typeWebhook: 'incomingMessageReceived',
          idMessage: reply.idMessage,
          timestamp: reply.timestamp,
          senderData: {
            chatId,
            chatName: chats.find((c) => c.chatId === chatId)?.name,
            chatType: 'user',
          },
          messageData: {
            typeMessage: 'textMessage',
            textMessageData: { textMessage: reply.textMessage },
          },
        },
      });
      return id;
    },
    async receiveNotification(signal) {
      while (!signal.aborted) {
        const next = queue[0];
        if (next && next.at <= Date.now()) return next;
        await delay(300, signal);
      }
      return null;
    },
    async deleteNotification(id) {
      if (queue[0]?.receiptId === id) queue.shift();
    },
  };
}
