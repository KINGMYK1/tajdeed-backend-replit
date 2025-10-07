import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createDefaultAdmin() {
  console.log('🔧 Création de l\'utilisateur admin par défaut...\n');

  const adminEmail = 'admin@tajdeed.com';
  const adminUsername = 'MYK';
  const adminPassword = 'MYK@123';
  const adminName = 'Administrateur Principal';

  try {
    // Vérifier si l'admin existe déjà
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username: adminUsername },
        ],
      },
    });

    if (existingAdmin) {
      console.log('✅ L\'utilisateur admin existe déjà');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Role: ${existingAdmin.role}\n`);
      return;
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Créer l'utilisateur admin
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        name: adminName,
        emailVerified: true,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        accounts: {
          create: {
            accountId: `${adminEmail}-credential`,
            providerId: 'credential',
            password: hashedPassword,
          },
        },
      },
    });

    console.log('✅ Utilisateur admin créé avec succès!\n');
    console.log('📋 Informations de connexion:');
    console.log('   Email:', adminEmail);
    console.log('   Username:', adminUsername);
    console.log('   Password:', adminPassword);
    console.log('   Role:', admin.role);
    console.log('   Status:', admin.status);
    console.log('\n⚠️  IMPORTANT: Changez ce mot de passe en production!\n');

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Exécuter le script
createDefaultAdmin()
  .then(() => {
    console.log('✅ Script terminé avec succès');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  });
