/**
 * NoteSphere OS — WebDAV & Nextcloud Synchronization Client
 */

export interface WebDAVConfig {
  url: string;
  username?: string;
  password?: string;
  autoSync?: boolean;
}

export async function testWebDAVConnection(config: WebDAVConfig): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/webdav/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: config.url,
        username: config.username,
        password: config.password,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || `Ошибка HTTP ${res.status}` };
    }
    return { success: true, message: data.message || 'Соединение успешно!' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Не удалось связаться с сервером' };
  }
}

export async function uploadBackupToWebDAV(
  config: WebDAVConfig,
  backupData: any
): Promise<{ success: boolean; message: string; fileName?: string }> {
  try {
    const res = await fetch('/api/webdav/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: config.url,
        username: config.username,
        password: config.password,
        backupData,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, message: data.error || `Ошибка HTTP ${res.status}` };
    }
    return { success: true, message: data.message || 'Бэкап сохранен на WebDAV', fileName: data.fileName };
  } catch (err: any) {
    return { success: false, message: err.message || 'Сбой передачи по WebDAV' };
  }
}
