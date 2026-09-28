export interface Credentials {
  idInstance: string;
  apiTokenInstance: string;
  apiUrl: string;
}
export interface InstanceSettings {
  typeInstance: string;
  webhookUrl: string;
  incomingWebhook: string;
  outgoingWebhook: string;
  outgoingAPIMessageWebhook: string;
  outgoingMessageWebhook: string;
}
export interface Receipt {
  receiptId: number;
  body: unknown;
}
export interface GreenApi {
  getState(signal: AbortSignal): Promise<string>;
  getSettings(signal: AbortSignal): Promise<InstanceSettings>;
  getHistory(chatId: string, signal: AbortSignal): Promise<unknown[]>;
  checkAccount(phone: string, signal: AbortSignal): Promise<string>;
  sendMessage(chatId: string, text: string, signal: AbortSignal): Promise<string>;
  receiveNotification(signal: AbortSignal): Promise<Receipt | null>;
  deleteNotification(receiptId: number, signal: AbortSignal): Promise<void>;
}
