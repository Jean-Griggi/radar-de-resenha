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

export function passwordResetEmail(name: string, resetUrl: string) {
  return `
    <div style="font-family:Outfit,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0c1220;color:#f4f7fb;border-radius:16px">
      <p style="letter-spacing:.3em;font-size:11px;color:#a78bfa">RESENHÔMETRO</p>
      <h1 style="font-size:22px;margin:12px 0 16px">Redefinir senha</h1>
      <p style="color:#94a3b8;line-height:1.5">Oi, ${name}. Recebemos um pedido para redefinir sua senha. O link vale por 1 hora.</p>
      <p style="margin:28px 0">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(90deg,#8b5cf6,#d946ef);color:#fff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600">
          Escolher nova senha
        </a>
      </p>
      <p style="color:#64748b;font-size:12px;line-height:1.5">Se você não pediu isso, ignore este e-mail. Sua senha continua a mesma.</p>
    </div>
  `;
}
