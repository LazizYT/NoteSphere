/**
 * NoteSphere OS — Telegram Cloud Synchronization Client
 * Secure backup and instant restore via Telegram Bot API
 */

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  lastBackupDate?: string;
  lastBackupFileId?: string;
  autoSyncOnSave?: boolean;
}

const STORAGE_KEY = 'ns_telegram_config';

/**
 * Load Telegram configuration from localStorage
 */
export function getTelegramConfig(): TelegramConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to parse telegram config:', err);
  }
  return {
    botToken: '',
    chatId: '',
    autoSyncOnSave: false,
  };
}

/**
 * Persist Telegram configuration to localStorage
 */
export function saveTelegramConfig(config: TelegramConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save telegram config:', err);
  }
}

/**
 * Test Telegram bot connection and chat_id
 */
export async function testTelegramConnection(
  config: Pick<TelegramConfig, 'botToken' | 'chatId'>
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken.trim(),
        chatId: config.chatId.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.error || 'Ошибка проверки Telegram бота' };
    }
    return { success: true, message: data.message || 'Связь с Telegram установлена!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Не удалось связаться с сервером NoteSphere' };
  }
}

/**
 * Upload complete snapshot backup as JSON document to Telegram chat
 */
export async function uploadBackupToTelegram(
  config: Pick<TelegramConfig, 'botToken' | 'chatId'>,
  backupData: any
): Promise<{ success: boolean; message: string; fileName?: string; fileId?: string }> {
  try {
    const res = await fetch('/api/telegram/backup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken.trim(),
        chatId: config.chatId.trim(),
        backupData,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.error || 'Ошибка отправки файла в Telegram' };
    }

    // Update local storage with last backup info
    const current = getTelegramConfig();
    saveTelegramConfig({
      ...current,
      botToken: config.botToken.trim(),
      chatId: config.chatId.trim(),
      lastBackupDate: new Date().toISOString(),
      lastBackupFileId: data.fileId || current.lastBackupFileId,
    });

    return {
      success: true,
      message: data.message || 'Бэкап сохранен в Telegram',
      fileName: data.fileName,
      fileId: data.fileId,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Сбой передачи резервной копии в Telegram' };
  }
}

/**
 * Fetch and parse latest backup snapshot from Telegram
 */
export async function restoreBackupFromTelegram(
  config: { botToken: string; chatId?: string; fileId?: string }
): Promise<{ success: boolean; message: string; snapshot?: any; fileId?: string }> {
  try {
    const res = await fetch('/api/telegram/latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botToken: config.botToken.trim(),
        chatId: config.chatId ? config.chatId.trim() : undefined,
        fileId: config.fileId ? config.fileId.trim() : undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, message: data.error || 'Ошибка восстановления из Telegram' };
    }

    if (data.fileId) {
      const current = getTelegramConfig();
      saveTelegramConfig({
        ...current,
        lastBackupFileId: data.fileId,
      });
    }

    return {
      success: true,
      message: data.message || 'Резервная копия получена из Telegram',
      snapshot: data.snapshot,
      fileId: data.fileId,
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Не удалось загрузить бэкап из Telegram' };
  }
}
