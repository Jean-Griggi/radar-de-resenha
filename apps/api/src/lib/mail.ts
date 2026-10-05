import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

export function mailConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, html: string) {
  if (!mailConfigured()) return false;

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: env.MAIL_FROM || `Resenhômetro <${env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}

/** Cores da identidade Redesenha: fundo estrutural escuro, papel #F3F1EC e vermelho de marca. Sem violeta. */
export function passwordResetEmail(name: string, resetUrl: string) {
  return `
    <div style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0b0b0f;color:#f3f1ec;border-radius:16px">
      <p style="letter-spacing:.3em;font-size:11px;color:#e31d3c;margin:0">RESENHÔMETRO</p>
      <h1 style="font-size:22px;margin:12px 0 16px">Redefinir senha</h1>
      <p style="color:#a8a8b4;line-height:1.5">Oi, ${escapeHtml(name)}. Recebemos um pedido para redefinir sua senha. O link vale por 1 hora e só funciona uma vez.</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#e31d3c;color:#f3f1ec;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
          Escolher nova senha
        </a>
      </p>
      <p style="color:#a8a8b4;font-size:12px;line-height:1.5">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
    </div>
  `;
}
