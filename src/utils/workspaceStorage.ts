import { LoadedFile } from '../types/tiss';

const DB_NAME = 'auditor-tiss-workspace';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const META_KEY = 'auditor-tiss-meta-v1';

export interface WorkspaceMeta {
  arquivoAtivoId: string | null;
  nomeHospital: string;
  aba: string;
  avancado: boolean;
  dark: boolean;
}

interface StoredFileRecord {
  id: string;
  nome: string;
  conteudo: string;
  caminho?: string;
  tamanhoBytes: number;
  dataCarregamento: string;
  ultimaAtualizacao?: string;
  precisaGerarHash?: boolean;
  eolOriginal?: '\r\n' | '\n';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function loadWorkspaceMeta(): Partial<WorkspaceMeta> {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveWorkspaceMeta(meta: WorkspaceMeta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export async function loadWorkspaceFiles(): Promise<LoadedFile[] | null> {
  try {
    const db = await openDb();
    return await new Promise<LoadedFile[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = (req.result || []) as StoredFileRecord[];
        if (records.length === 0) {
          resolve(null);
          return;
        }
        const files: LoadedFile[] = records.map((r) => ({
          id: r.id,
          nome: r.nome,
          conteudo: r.conteudo,
          caminho: r.caminho,
          tamanhoBytes: r.tamanhoBytes,
          dataCarregamento: new Date(r.dataCarregamento),
          ultimaAtualizacao: r.ultimaAtualizacao ? new Date(r.ultimaAtualizacao) : undefined,
          precisaGerarHash: r.precisaGerarHash,
          eolOriginal: r.eolOriginal,
        }));
        resolve(files);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveWorkspaceFiles(files: LoadedFile[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const activeIds = new Set(files.map((f) => f.id));

      const keysReq = store.getAllKeys();
      keysReq.onsuccess = () => {
        for (const key of keysReq.result) {
          if (!activeIds.has(String(key))) {
            store.delete(key);
          }
        }
        for (const f of files) {
          const record: StoredFileRecord = {
            id: f.id,
            nome: f.nome,
            conteudo: f.conteudo,
            caminho: f.caminho,
            tamanhoBytes: f.tamanhoBytes,
            dataCarregamento:
              f.dataCarregamento instanceof Date
                ? f.dataCarregamento.toISOString()
                : String(f.dataCarregamento),
            ultimaAtualizacao:
              f.ultimaAtualizacao instanceof Date
                ? f.ultimaAtualizacao.toISOString()
                : f.ultimaAtualizacao
                  ? String(f.ultimaAtualizacao)
                  : undefined,
            precisaGerarHash: f.precisaGerarHash,
            eolOriginal: f.eolOriginal,
          };
          store.put(record);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silently ignore IndexedDB errors so editing is never interrupted
  }
}
