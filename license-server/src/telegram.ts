/**
 * Service pengiriman peringatan Telegram ke Developer
 * Sesuai Kriteria Keberhasilan PRD:
 * "Percobaan login di perangkat ke-3 dengan kode lisensi yang sama otomatis ditolak dan mengirim peringatan ke Telegram Developer."
 */

export interface SecurityAlertPayload {
  licenseKey: string;
  attemptedDeviceId: string;
  attemptedDeviceName?: string;
  registeredDevices: string[];
  clientIp?: string;
  reason: string;
}

export async function sendTelegramAlert(payload: SecurityAlertPayload): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const message = [
    '🚨 *PERINGATAN KEAMANAN LISENSI (MUSIK KLONA)* 🚨',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    `🔑 *License Key:* \`${payload.licenseKey}\``,
    `⚠️ *Alasan:* ${payload.reason}`,
    `📱 *Device Baru (Ditolak):* \`${payload.attemptedDeviceId}\``,
    `🏷️ *Model / Nama:* ${payload.attemptedDeviceName || 'Tidak Diketahui'}`,
    `🌐 *IP Pengakses:* \`${payload.clientIp || 'Unknown'}\``,
    `📋 *Device Terdaftar (${payload.registeredDevices.length}/2):*`,
    payload.registeredDevices.map((d, i) => `   ${i + 1}. \`${d}\``).join('\n'),
    `⏰ *Waktu:* ${now} WIB`,
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '⛔ *Status:* Akses diblokir otomatis oleh server anti-sharing.'
  ].join('\n');

  console.warn(`[TELEGRAM ALERT LOG]:\n${message}`);

  if (!botToken || !chatId) {
    console.info('[TELEGRAM] Token atau Chat ID belum diset di .env. Peringatan dicatat ke log server.');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json() as { ok: boolean; description?: string };
    if (!result.ok) {
      console.error('[TELEGRAM] Gagal kirim pesan ke bot:', result.description);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Exception saat mengirim alert:', error);
    return false;
  }
}

