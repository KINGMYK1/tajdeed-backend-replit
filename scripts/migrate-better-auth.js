#!/usr/bin/env node

/**
 * Script de migration pour Better Auth
 * Ce script aide à migrer la base de données vers le nouveau schéma Better Auth
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 Migration vers Better Auth\n');
  console.log('Ce script va :');
  console.log('  1. Générer le client Prisma avec le nouveau schéma');
  console.log('  2. Créer une migration de la base de données');
  console.log('  3. Appliquer la migration\n');

  console.log('⚠️  ATTENTION : Cette migration va :');
  console.log('  - Supprimer toutes les données des tables Account, Session et VerificationToken');
  console.log('  - Modifier la structure de ces tables');
  console.log('  - Les utilisateurs (User) seront conservés\n');

  const answer = await question('Voulez-vous continuer ? (oui/non): ');
  
  if (answer.toLowerCase() !== 'oui' && answer.toLowerCase() !== 'o' && answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('\n❌ Migration annulée');
    rl.close();
    process.exit(0);
  }

  try {
    console.log('\n📦 Étape 1/3 : Génération du client Prisma...');
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Client Prisma généré\n');

    console.log('📝 Étape 2/3 : Création de la migration...');
    execSync('npx prisma migrate dev --name update_better_auth_schema', { stdio: 'inherit' });
    console.log('✅ Migration créée et appliquée\n');

    console.log('🎉 Migration terminée avec succès !\n');
    console.log('Vous pouvez maintenant démarrer votre application avec : yarn start\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    console.log('\n💡 Solutions possibles :');
    console.log('  1. Vérifiez que votre DATABASE_URL est correcte dans .env');
    console.log('  2. Assurez-vous que la base de données est accessible');
    console.log('  3. Si vous êtes en développement local, vous pouvez réinitialiser :');
    console.log('     npx prisma migrate reset\n');
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
