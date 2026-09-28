export class ApiError extends Error {
  readonly retryable: boolean;
  readonly uncertain: boolean;
  constructor(message: string, retryable = false, uncertain = false) {
    super(message);
    this.name = 'ApiError';
    this.retryable = retryable;
    this.uncertain = uncertain;
  }
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

export function httpError(status: number): ApiError {
  if (status === 401 || status === 403)
    return new ApiError(
      'Доступ запрещён. Проверьте idInstance, токен, сервер API и состояние аккаунта.',
    );
  if (status === 466)
    return new ApiError(
      'Достигнут лимит чатов тарифа GREEN-API. Проверьте лимиты в личном кабинете.',
    );
  if (status === 469)
    return new ApiError('MAX временно ограничил поиск по номеру. Повторите попытку позже.');
  if (status === 429)
    return new ApiError('Слишком много запросов к GREEN-API. Подождите несколько секунд.', true);
  if (status >= 500) return new ApiError('Сервер GREEN-API временно недоступен.', true, true);
  return new ApiError(
    `GREEN-API отклонил запрос (код ${status}). Проверьте параметры и настройки инстанса.`,
  );
}
