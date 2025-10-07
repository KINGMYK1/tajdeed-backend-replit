import { sendEmail } from './emailService';

/**
 * Envoie un email avec un code de vérification à 6 chiffres
 * @param email - Adresse email du destinataire
 * @param code - Code de vérification à 6 chiffres
 */
export async function sendVerificationCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  console.log('📧 Envoi email de vérification avec code à 6 chiffres');
  console.log('   Email:', email);
  console.log('   Code:', code);

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
            color: #28a745;
          }
          .code-box {
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border: 2px solid #28a745;
            text-align: center;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #28a745;
            font-family: 'Courier New', monospace;
          }
          .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            padding: 10px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔒 Tajdeed</div>
            <h2>Vérification de votre email</h2>
          </div>
          
          <p>Bonjour,</p>
          
          <p>Merci de vous être inscrit sur <strong>Tajdeed</strong> !</p>
          
          <p>Pour finaliser votre inscription et sécuriser votre compte, veuillez entrer ce code de vérification :</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Votre code de vérification</p>
            <div class="code">${code}</div>
          </div>
          
          <div class="warning">
            <p style="margin: 5px 0;"><strong>⏰ Ce code expire dans 15 minutes</strong></p>
            <p style="margin: 5px 0; font-size: 12px;">Pour votre sécurité, ne partagez jamais ce code.</p>
          </div>
          
          <p>Si vous n'avez pas créé de compte sur Tajdeed, vous pouvez ignorer cet email en toute sécurité.</p>
          
          <div class="footer">
            <p>© 2025 Tajdeed - Plateforme C2C de vente entre particuliers</p>
            <p>Cet email a été envoyé à ${email}</p>
            <p>Pour toute question, contactez-nous à support@tajdeed.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Vérification de votre email - Tajdeed

    Bonjour,

    Merci de vous être inscrit sur Tajdeed !

    Votre code de vérification : ${code}

    Ce code expire dans 15 minutes.

    Pour votre sécurité, ne partagez jamais ce code.

    Si vous n'avez pas créé de compte sur Tajdeed, vous pouvez ignorer cet email.

    Cordialement,
    L'équipe Tajdeed
  `;

  await sendEmail({
    to: email,
    subject: '✅ Code de vérification - Tajdeed',
    html,
    text,
  });
}

/**
 * Envoie un email avec un code de réinitialisation de mot de passe à 6 chiffres
 * @param email - Adresse email du destinataire
 * @param code - Code de réinitialisation à 6 chiffres
 */
export async function sendPasswordResetCodeEmail(
  email: string,
  code: string,
): Promise<void> {
  console.log('📧 Envoi email de réinitialisation avec code à 6 chiffres');
  console.log('   Email:', email);
  console.log('   Code:', code);

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
            color: #dc3545;
          }
          .code-box {
            background: #fff;
            padding: 20px;
            border-radius: 10px;
            margin: 30px 0;
            border: 2px solid #dc3545;
            text-align: center;
          }
          .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #dc3545;
            font-family: 'Courier New', monospace;
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🔐 Tajdeed</div>
            <h2>Réinitialisation de mot de passe</h2>
          </div>
          
          <p>Bonjour,</p>
          
          <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Tajdeed</strong>.</p>
          
          <p>Veuillez entrer ce code de vérification pour continuer :</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Votre code de réinitialisation</p>
            <div class="code">${code}</div>
          </div>
          
          <div class="warning">
            <p style="margin: 5px 0;"><strong>⚠️ Important :</strong></p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Ce code expire dans 15 minutes</li>
              <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
              <li>Votre mot de passe actuel reste inchangé tant que vous n'en créez pas un nouveau</li>
            </ul>
          </div>
          
          <div class="footer">
            <p>© 2025 Tajdeed - Plateforme C2C de vente entre particuliers</p>
            <p>Cet email a été envoyé à ${email}</p>
            <p>Pour toute question, contactez-nous à support@tajdeed.com</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Réinitialisation de mot de passe - Tajdeed

    Bonjour,

    Vous avez demandé la réinitialisation de votre mot de passe sur Tajdeed.

    Votre code de vérification : ${code}

    Ce code expire dans 15 minutes.

    Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
    Votre mot de passe actuel reste inchangé.

    Cordialement,
    L'équipe Tajdeed
  `;

  await sendEmail({
    to: email,
    subject: '🔐 Code de réinitialisation - Tajdeed',
    html,
    text,
  });
}
