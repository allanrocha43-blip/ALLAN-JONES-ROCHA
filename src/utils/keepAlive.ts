/**
 * keepAlive.ts
 * -----------------------------------------------------------------------
 * Mantém a sessão ativa com pings leves e silenciosos ao servidor
 * (/api/health), evitando que o container entre em hibernação/pausa
 * durante o uso contínuo puramente local (edição e auditoria de XML).
 */

const PING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutos

async function sendSilentPing(): Promise<void> {
  try {
    await fetch('/api/health', {
      method: 'GET',
      cache: 'no-store',
      keepalive: true,
    });
  } catch {
    // Falhas transitórias de rede não devem interromper nem recarregar o app
  }
}

export function startKeepAlive(): () => void {
  // Ping inicial após montagem
  void sendSilentPing();

  const intervalId = window.setInterval(() => {
    void sendSilentPing();
  }, PING_INTERVAL_MS);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void sendSilentPing();
    }
  };

  const handleOnline = () => {
    void sendSilentPing();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('online', handleOnline);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('online', handleOnline);
  };
}
