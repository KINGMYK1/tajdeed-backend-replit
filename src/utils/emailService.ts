/**
 * Service d'envoi d'emails via SMTP (Mailtrap, Gmail, etc.)
 * Alternative à replitmail.ts pour les environnements non-Replit
 */

import * as nodemailer from 'nodemailer';

/**
 * Interface pour les options d'email
 */
interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

/**
 * Configuration du transporteur SMTP
 * Utilise les variables d'environnement pour la configuration
 */
const createTransporter = () => {
  const config = {
    host: process.env.EMAIL_HOST || 'sandbox.smtp.mailtrap.io',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_PORT === '465', // true pour le port 465, false pour les autres
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  };

  // Validation de la configuration
  if (!config.auth.user || !config.auth.pass) {
    throw new Error(
      'Configuration email incomplète. Veuillez définir EMAIL_USER et EMAIL_PASSWORD dans le fichier .env'
    );
  }

  return nodemailer.createTransport(config);
};

/**
 * Envoie un email via SMTP
 * @param options - Options de l'email (destinataire, sujet, contenu)
 * @returns Promise résolue quand l'email est envoyé
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@tajdeed.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
    };

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email envoyé avec succès:', {
      messageId: info.messageId,
      to: options.to,
      subject: options.subject,
    });

    // Mailtrap affiche une URL de prévisualisation
    if (info.response && info.response.includes('mailtrap')) {
      console.log('📧 Prévisualisez l\'email sur Mailtrap');
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw new Error(`Échec de l'envoi de l'email: ${error.message}`);
  }
}

/**
 * Envoie un email de vérification
 * @param email - Adresse email du destinataire
 * @param token - Token de vérification
 * @param url - URL de base de l'application
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  url: string
): Promise<void> {
  const verificationUrl = `${url}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4CAF50;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #45a049;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .token-box {
            background: #fff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #ddd;
            font-family: monospace;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">✨ Tajdeed</div>
            <h2>Bienvenue sur Tajdeed !</h2>
          </div>
          
          <p>Bonjour,</p>
          
          <p>Merci de vous être inscrit sur <strong>Tajdeed</strong>, votre plateforme de mode d'occasion de confiance.</p>
          
          <p>Pour activer votre compte et commencer à acheter ou vendre des articles, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
          
          <div style="text-align: center;">
            <a href="${verificationUrl}" class="button">Vérifier mon email</a>
          </div>
          
          <p>Ou copiez-collez ce lien dans votre navigateur :</p>
          <div class="token-box">${verificationUrl}</div>
          
          <p><strong>⏰ Ce lien est valable pendant 24 heures.</strong></p>
          
          <p>Si vous n'avez pas créé de compte sur Tajdeed, vous pouvez ignorer cet email en toute sécurité.</p>
          
          <div class="footer">
            <p>© 2025 Tajdeed - Plateforme C2C de mode d'occasion</p>
            <p>Cet email a été envoyé à ${email}</p>
            <p>Si vous avez des questions, contactez-nous à support@tajdeed.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Bienvenue sur Tajdeed !

    Merci de vous être inscrit sur Tajdeed, votre plateforme de mode d'occasion de confiance.

    Pour activer votre compte, veuillez vérifier votre adresse email en visitant ce lien :
    ${verificationUrl}

    Ce lien est valable pendant 24 heures.

    Si vous n'avez pas créé de compte sur Tajdeed, vous pouvez ignorer cet email.

    Cordialement,
    L'équipe Tajdeed
  `;

  await sendEmail({
    to: email,
    subject: '✨ Vérifiez votre email - Tajdeed',
    html,
    text,
  });
}

/**
 * Envoie un email de réinitialisation de mot de passe
 * @param email - Adresse email du destinataire
 * @param token - Token de réinitialisation
 * @param url - URL de base de l'application
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  url: string
): Promise<void> {
  const resetUrl = `${url}/auth/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 32px;
            font-weight: bold;
            color: #4CAF50;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #FF5722;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
          }
          .button:hover {
            background-color: #E64A19;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .token-box {
            background: #fff;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border: 1px solid #ddd;
            font-family: monospace;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔒 Tajdeed</div>
            <h2>Réinitialisation de mot de passe</h2>
          </div>
          
          <p>Bonjour,</p>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Tajdeed</strong>.</p>
          
          <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          
          <p>Ou copiez-collez ce lien dans votre navigateur :</p>
          <div class="token-box">${resetUrl}</div>
          
          <div class="warning">
            <p><strong>⚠️ Important :</strong></p>
            <ul>
              <li>Ce lien est valable pendant 1 heure</li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
              <li>Votre mot de passe actuel reste inchangé tant que vous ne créez pas un nouveau</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>© 2025 Tajdeed - Plateforme C2C de mode d'occasion</p>
            <p>Cet email a été envoyé à ${email}</p>
            <p>Si vous avez des questions, contactez-nous à support@tajdeed.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Réinitialisation de mot de passe - Tajdeed

    Bonjour,

    Vous avez demandé la réinitialisation de votre mot de passe sur Tajdeed.

    Visitez ce lien pour créer un nouveau mot de passe :
    ${resetUrl}

    Ce lien est valable pendant 1 heure.

    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    Votre mot de passe actuel reste inchangé.

    Cordialement,
    L'équipe Tajdeed
  `;

  await sendEmail({
    to: email,
    subject: '🔒 Réinitialisation de mot de passe - Tajdeed',
    html,
    text,
  });
}
