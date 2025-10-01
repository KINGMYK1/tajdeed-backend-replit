# Guide de Migration du Schéma Prisma pour Better Auth

## Changements Effectués

### 1. Modèle Account
- Ajouté `accountId` (unique) : identifiant du compte pour Better Auth
- Renommé `type` → supprimé (Better Auth utilise `providerId`)
- Ajouté `providerId` : identifiant du provider (credential, google, etc.)
- Renommé les champs avec snake_case pour correspondre aux conventions Better Auth
- Ajouté `password` : pour l'authentification email/password
- Ajouté `createdAt` et `updatedAt`

### 2. Modèle Session
- Renommé `expires` → `expiresAt` (convention Better Auth)
- Supprimé `deviceInfo` (non utilisé par Better Auth)
- Ajouté `createdAt` et `updatedAt`
- Appliqué le mapping snake_case

### 3. Modèle VerificationToken
- Renommé `expires` → `expiresAt`
- Supprimé le champ `type` et l'enum `VerificationType`
- Ajouté `createdAt` et `updatedAt`

### 4. Enum VerificationType
- Supprimé (non nécessaire avec Better Auth)

## Étapes de Migration

1. **Sauvegarder la base de données** (si elle contient des données importantes)

2. **Générer une nouvelle migration**
   ```bash
   npx prisma migrate dev --name update_for_better_auth
   ```

3. **Ou réinitialiser la base de données** (si en développement sans données importantes)
   ```bash
   npx prisma migrate reset
   npx prisma generate
   ```

4. **Vérifier la migration**
   ```bash
   npx prisma studio
   ```

## Commandes à Exécuter

```bash
# 1. Générer le client Prisma avec le nouveau schéma
npx prisma generate

# 2. Créer et appliquer la migration
npx prisma migrate dev --name update_better_auth_schema

# 3. Démarrer l'application
yarn start
```

## Notes Importantes

- Les données existantes dans `Account`, `Session` et `VerificationToken` seront perdues
- Assurez-vous d'avoir une DATABASE_URL valide dans votre `.env`
- Better Auth gérera maintenant toutes les opérations d'authentification
- Le schéma est maintenant conforme aux exigences de Better Auth
