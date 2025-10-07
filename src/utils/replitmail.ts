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
 * Envoie un email de vérification avec un lien absolu
 */
export async function sendVerificationEmail(
  email: string,
  token: string
): Promise<void> {
  // Nettoyer le token
  const cleanToken = token
    .replace(/^token=/, '')
    .split('&')[0]
    .split('?')[0]
    .trim();
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationLink = `${frontendUrl}/verify-email?token=${cleanToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">Bienvenue sur Tajdeed !</h1>
      <p>Bonjour,</p>
      <p>Merci de vous être inscrit(e) sur Tajdeed, votre nouvelle plateforme de vente entre particuliers.</p>
      <p>Pour finaliser votre inscription et sécuriser votre compte, veuillez vérifier votre adresse email :</p>
      <a href="${verificationLink}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Vérifier mon email</a>
      <p>Ce lien expirera dans 1 heure pour votre sécurité.</p>
      <p>Une fois vérifiée, vous pourrez :</p>
      <ul>
        <li>Publier vos annonces</li>
        <li>Acheter en toute sécurité</li>
        <li>Échanger avec la communauté</li>
      </ul>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">Équipe Tajdeed</p>
    </div>
  `;
  
  await sendEmail({
    to: email,
    subject: '✉️ Vérifiez votre adresse email - Tajdeed',
    html,
  });
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