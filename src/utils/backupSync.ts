/**
 * NoteSphere OS — 1-Click Backup / Restore & Cloud Sync
 * Exports and imports full system snapshots (.json) and interacts with Google Drive.
 */

export interface NoteSphereBackupSnapshot {
  _app?: string;
  schemaVersion?: string;
  version: string;
  timestamp: string;
  exportedAt?: string;
  notes: any[];
  categories: any[];
  tasks: any[];
  habits?: any[];
  transactions?: any[];
  budget?: any;
  financeBudget?: any;
  financeGoals?: any[];
  goals?: any[];
  currency?: string;
  deletedNotes?: any[];
  reminders?: any[];
  alarms?: any[];
  canvasCards?: any[];
  canvasLinks?: any[];
  projects?: any[];
}

export function exportFullBackupJSON(data: {
  notes: any[];
  categories: any[];
  tasks: any[];
  projects?: any[];
  habits?: any[];
  transactions?: any[];
  budget?: any;
  financeBudget?: any;
  financeGoals?: any[];
  goals?: any[];
  currency?: string;
  deletedNotes?: any[];
  reminders?: any[];
  alarms?: any[];
  canvasCards?: any[];
  canvasLinks?: any[];
}) {
  const snapshot: NoteSphereBackupSnapshot = {
    _app: 'NoteSphere OS',
    schemaVersion: '2.5.0',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    exportedAt: new Date().toLocaleString(),
    ...data,
  };

  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];

  const a = document.createElement('a');
  a.href = url;
  a.download = `notesphere-full-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseAndValidateBackup(jsonString: string): NoteSphereBackupSnapshot {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Файл поврежден или не является объектом JSON');
  }
  if (!Array.isArray(parsed.notes) && !Array.isArray(parsed.tasks)) {
    throw new Error('Некорректный формат бэкапа NoteSphere OS');
  }
  return parsed as NoteSphereBackupSnapshot;
}

export async function readBackupFile(file: File): Promise<NoteSphereBackupSnapshot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const snapshot = parseAndValidateBackup(text);
        resolve(snapshot);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsText(file);
  });
}
