import { z } from "zod";
import * as nodemailer from 'nodemailer';

// Zod schema matching the backend implementation
export const zSmtpMessage = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe("Recipient email address(es)"),
  cc: z
    .union([z.string().email(), z.array(z.string().email())])
    .optional()
    .describe("CC recipient email address(es)"),
  subject: z.string().describe("Email subject"),
  text: z.string().optional().describe("Plain text body"),
  html: z.string().optional().describe("HTML body"),
  attachments: z
    .array(
      z.object({
        filename: z.string().describe("File name"),
        content: z.string().describe("Base64 encoded content"),
        contentType: z.string().optional().describe("MIME type"),
        encoding: z
          .enum(["base64", "7bit", "quoted-printable", "binary"])
          .default("base64"),
      })
    )
    .optional()
    .describe("Email attachments"),
});

export type SmtpMessage = z.infer<typeof zSmtpMessage>

/**
 * Crée un transporteur Nodemailer avec configuration Mailtrap/SMTP
 */
function createTransporter() {
  const config = {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  if (!config.auth.user || !config.auth.pass) {
    throw new Error(
      'Configuration email manquante. Veuillez définir EMAIL_USER et EMAIL_PASSWORD dans .env'
    );
  }

  return nodemailer.createTransport(config);
}

/**
 * Envoie un email via Nodemailer (compatible Mailtrap, Gmail, etc.)
 */
export async function sendEmail(message: SmtpMessage): Promise<{
  accepted: string[];
  rejected: string[];
  pending?: string[];
  messageId: string;
  response: string;
}> {
  try {
    const transporter = createTransporter();
    
    // Préparer les destinataires
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    const cc = message.cc 
      ? (Array.isArray(message.cc) ? message.cc.join(', ') : message.cc)
      : undefined;

    // Préparer les pièces jointes
    const attachments = message.attachments?.map(att => ({
      filename: att.filename,
      content: att.content,
      contentType: att.contentType,
      encoding: att.encoding,
    }));

    // Envoyer l'email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@tajdeed.com',
      to,
      cc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments,
    });

    console.log('✅ Email envoyé avec succès:', {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });

    return {
      accepted: info.accepted as string[],
      rejected: info.rejected as string[],
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Échec de l'envoi de l'email: ${errorMessage}`);
  }
}