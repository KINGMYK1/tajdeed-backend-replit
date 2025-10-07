# 🛡️ GUIDE D'UTILISATION DES GUARDS
## Tajdeed Backend - Système d'Autorisation

---

## 📚 TABLE DES MATIÈRES

1. [Vue d'ensemble](#vue-densemble)
2. [Guards disponibles](#guards-disponibles)
3. [Hiérarchie des rôles](#hiérarchie-des-rôles)
4. [Exemples d'utilisation](#exemples-dutilisation)
5. [Bonnes pratiques](#bonnes-pratiques)
6. [Cas d'usage courants](#cas-dusage-courants)
7. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble

Le projet utilise un système de guards NestJS pour protéger les endpoints selon les rôles utilisateurs. Chaque guard hérite de `CanActivate` et effectue une vérification en cascade.

### Fichiers des Guards

- `src/auth/guards/auth.guard.ts` - AuthGuard et AdminGuard
- `src/auth/guards/role.guards.ts` - ModeratorGuard, AdminOnlyGuard, SuperAdminGuard

---

## 🔒 Guards Disponibles

### 1. AuthGuard ✅
**Fichier** : `src/auth/guards/auth.guard.ts`

**Rôle** : Vérification de l'authentification JWT

**Autorise** : Tous les utilisateurs authentifiés (avec token valide)

**Vérifie** :
- Présence du token Bearer dans Authorization header
- Validité du JWT
- Existence de la session en base de données
- Session non expirée

**Usage** :
```typescript
import { AuthGuard } from '../auth/guards/auth.guard';

@Get('profile')
@UseGuards(AuthGuard)
async getProfile(@Req() req: Request) {
  // req.user contient : id, email, name, role, emailVerified
  return req.user;
}
```

**Erreurs lancées** :
- `UnauthorizedException` : Token manquant, invalide ou session expirée

---

### 2. AdminGuard ✅
**Fichier** : `src/auth/guards/auth.guard.ts`

**Rôle** : Vérification des droits modérateur/admin

**Autorise** : MODERATOR, ADMIN, SUPER_ADMIN

**Bloque** : USER

**Cascade** :
1. Vérifie authentification (AuthGuard)
2. Vérifie rôle dans ['MODERATOR', 'ADMIN', 'SUPER_ADMIN']

**Usage** :
```typescript
import { AuthGuard, AdminGuard } from '../auth/guards/auth.guard';

@Post('moderate')
@UseGuards(AuthGuard, AdminGuard)
async moderateContent(@Body() dto: ModerateDto) {
  // Accessible uniquement aux MODERATOR, ADMIN, SUPER_ADMIN
  return this.moderationService.moderate(dto);
}
```

**Erreurs lancées** :
- `UnauthorizedException` : Si authentification échoue
- `UnauthorizedException` : Si rôle insuffisant (message : "Accès réservé aux modérateurs...")

---

### 3. ModeratorGuard ✅
**Fichier** : `src/auth/guards/role.guards.ts`

**Rôle** : Protection modération (identique à AdminGuard mais avec meilleure nomenclature)

**Autorise** : MODERATOR, ADMIN, SUPER_ADMIN

**Bloque** : USER

**Usage** :
```typescript
import { AuthGuard } from '../auth/guards/auth.guard';
import { ModeratorGuard } from '../auth/guards/role.guards';

@Controller('moderation')
@UseGuards(AuthGuard, ModeratorGuard)
export class ModerationController {
  // Tous les endpoints accessibles aux modérateurs et +
}
```

**Différence avec AdminGuard** : 
- Même fonctionnalité
- Meilleure clarté sémantique
- Message d'erreur plus spécifique (ForbiddenException au lieu de UnauthorizedException)

---

### 4. AdminOnlyGuard ✅
**Fichier** : `src/auth/guards/role.guards.ts`

**Rôle** : Protection stricte administrateurs

**Autorise** : ADMIN, SUPER_ADMIN uniquement

**Bloque** : USER, MODERATOR

**Cascade** :
1. Vérifie authentification (AuthGuard)
2. Vérifie rôle dans ['ADMIN', 'SUPER_ADMIN']

**Usage** :
```typescript
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminOnlyGuard } from '../auth/guards/role.guards';

@Post('admin/create')
@UseGuards(AuthGuard, AdminOnlyGuard)
async createAdmin(@Body() dto: CreateAdminDto) {
  // Accessible uniquement aux ADMIN et SUPER_ADMIN
  return this.authService.createAdmin(dto);
}
```

**Erreurs lancées** :
- `UnauthorizedException` : Si authentification échoue
- `ForbiddenException` : Si rôle insuffisant (USER ou MODERATOR)

---

### 5. SuperAdminGuard ✅
**Fichier** : `src/auth/guards/role.guards.ts`

**Rôle** : Protection stricte super-admin

**Autorise** : SUPER_ADMIN uniquement

**Bloque** : USER, MODERATOR, ADMIN

**Cascade** :
1. Vérifie authentification (AuthGuard)
2. Vérifie rôle === 'SUPER_ADMIN'

**Usage** :
```typescript
import { AuthGuard } from '../auth/guards/auth.guard';
import { SuperAdminGuard } from '../auth/guards/role.guards';

@Delete('admin/:id')
@UseGuards(AuthGuard, SuperAdminGuard)
async deleteAdmin(@Param('id') id: string) {
  // Accessible uniquement aux SUPER_ADMIN
  return this.authService.removeAdmin(id);
}
```

**Erreurs lancées** :
- `UnauthorizedException` : Si authentification échoue
- `ForbiddenException` : Si rôle différent de SUPER_ADMIN

---

## 👥 Hiérarchie des Rôles

```
┌─────────────────────────────────────────┐
│        SUPER_ADMIN (Niveau 4)           │
│  🔴 Tous les droits + Gestion admins    │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│           ADMIN (Niveau 3)              │
│  🟠 Gestion utilisateurs + Modération   │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│        MODERATOR (Niveau 2)             │
│  🟡 Actions de modération               │
└───────────────┬─────────────────────────┘
                │
┌───────────────▼─────────────────────────┐
│           USER (Niveau 1)               │
│  🟢 Accès basique authentifié           │
└─────────────────────────────────────────┘
```

### Permissions par Rôle

| Rôle | Authentification | Modération | Gestion Users | Gestion Admins | Suppression Admin |
|------|------------------|------------|---------------|----------------|-------------------|
| USER | ✅ | ❌ | ❌ | ❌ | ❌ |
| MODERATOR | ✅ | ✅ | ❌ | ❌ | ❌ |
| ADMIN | ✅ | ✅ | ✅ | ✅ (sauf SUPER_ADMIN) | ❌ |
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 💡 Exemples d'Utilisation

### Exemple 1 : Endpoint Public
```typescript
@Controller('products')
export class ProductsController {
  @Get()
  // ❌ PAS de guards = PUBLIC
  async getProducts() {
    return this.productsService.findAll();
  }
}
```

---

### Exemple 2 : Endpoint Authentifié
```typescript
@Controller('orders')
export class OrdersController {
  @Post()
  @UseGuards(AuthGuard) // ✅ Authentification requise
  async createOrder(@Req() req: Request, @Body() dto: CreateOrderDto) {
    const userId = req.user.id;
    return this.ordersService.create(userId, dto);
  }
}
```

---

### Exemple 3 : Endpoint Modération
```typescript
@Controller('moderation')
export class ModerationController {
  @Post('warning')
  @UseGuards(AuthGuard, ModeratorGuard) // ✅ Modérateur requis
  async addWarning(@Body() dto: WarningDto) {
    return this.moderationService.addWarning(dto);
  }
}
```

---

### Exemple 4 : Endpoint Admin
```typescript
@Controller('admin')
export class AdminController {
  @Post('users/:id/role')
  @UseGuards(AuthGuard, AdminOnlyGuard) // ✅ Admin requis
  async updateUserRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.authService.updateUserRole(id, dto.role);
  }
}
```

---

### Exemple 5 : Endpoint Super Admin
```typescript
@Controller('admin')
export class AdminController {
  @Delete(':id')
  @UseGuards(AuthGuard, SuperAdminGuard) // ✅ Super Admin requis
  async deleteAdmin(@Param('id') id: string) {
    return this.authService.removeAdmin(id);
  }
}
```

---

### Exemple 6 : Protection Contrôleur Entier
```typescript
@Controller('moderation')
@UseGuards(AuthGuard, ModeratorGuard) // ✅ Tous les endpoints protégés
export class ModerationController {
  @Get('stats')
  async getStats() {
    // Automatiquement protégé par les guards du contrôleur
    return this.moderationService.getStats();
  }

  @Post('action')
  async applyAction(@Body() dto: ActionDto) {
    // Automatiquement protégé aussi
    return this.moderationService.applyAction(dto);
  }
}
```

---

### Exemple 7 : Guards Multiples avec Logique Custom
```typescript
@Controller('admin')
export class AdminController {
  @Put('user/:id/suspend')
  @UseGuards(AuthGuard, AdminGuard)
  async suspendUser(
    @Param('id') userId: string,
    @Body() dto: SuspendDto,
    @Req() req: Request,
  ) {
    // Vérification supplémentaire dans la méthode
    const adminRole = req.user.role;
    
    // Empêcher un ADMIN de suspendre un autre ADMIN
    const targetUser = await this.userService.findOne(userId);
    if (targetUser.role === 'ADMIN' && adminRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Seuls les SUPER_ADMIN peuvent suspendre des ADMIN');
    }
    
    return this.authService.suspendUser(userId, dto.reason);
  }
}
```

---

## ✅ Bonnes Pratiques

### 1. Toujours Utiliser AuthGuard en Premier
```typescript
// ✅ CORRECT
@UseGuards(AuthGuard, AdminGuard)

// ❌ INCORRECT
@UseGuards(AdminGuard) // AdminGuard appelle AuthGuard mais moins clair
```

### 2. Choisir le Guard Approprié

| Besoin | Guard à Utiliser |
|--------|------------------|
| N'importe quel utilisateur authentifié | `AuthGuard` |
| Modérateurs et supérieurs | `ModeratorGuard` ou `AdminGuard` |
| Administrateurs uniquement | `AdminOnlyGuard` |
| Super-admin uniquement | `SuperAdminGuard` |

### 3. Protection au Niveau Contrôleur
```typescript
// ✅ BIEN : Tous les endpoints protégés par défaut
@Controller('admin')
@UseGuards(AuthGuard, AdminOnlyGuard)
export class AdminController {
  @Get('stats') async getStats() { ... }
  @Post('create') async create() { ... }
}
```

### 4. Documentation des Guards
```typescript
/**
 * Créer un nouvel administrateur
 * 
 * @security ADMIN, SUPER_ADMIN uniquement
 * @throws UnauthorizedException - Si non authentifié
 * @throws ForbiddenException - Si rôle insuffisant
 */
@Post('admin/create')
@UseGuards(AuthGuard, AdminOnlyGuard)
async createAdmin(@Body() dto: CreateAdminDto) { ... }
```

### 5. Tests des Guards
```typescript
describe('AdminController', () => {
  it('should block USER from accessing admin endpoints', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send(createAdminDto)
      .expect(403); // ForbiddenException
  });

  it('should allow ADMIN to access admin endpoints', async () => {
    const response = await request(app.getHttpServer())
      .post('/admin/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(createAdminDto)
      .expect(201); // Success
  });
});
```

---

## 🎯 Cas d'Usage Courants

### Marketplace Tajdeed

#### Produits (Products)
```typescript
@Controller('products')
export class ProductsController {
  @Get() // PUBLIC
  async getProducts() { ... }

  @Get(':id') // PUBLIC
  async getProduct(@Param('id') id: string) { ... }

  @Post()
  @UseGuards(AuthGuard) // USER+
  async createProduct(@Body() dto: CreateProductDto) { ... }

  @Put(':id')
  @UseGuards(AuthGuard) // USER+ (avec vérif ownership)
  async updateProduct(@Param('id') id: string) { ... }

  @Delete(':id')
  @UseGuards(AuthGuard, ModeratorGuard) // MODERATOR+ (modération)
  async deleteProduct(@Param('id') id: string) { ... }
}
```

#### Messages
```typescript
@Controller('messages')
@UseGuards(AuthGuard) // Tous les endpoints nécessitent l'authentification
export class MessagesController {
  @Get()
  async getMyMessages(@Req() req: Request) { ... }

  @Post()
  async sendMessage(@Body() dto: SendMessageDto) { ... }

  @Delete(':id')
  async deleteMessage(@Param('id') id: string) { ... }
}
```

#### Modération
```typescript
@Controller('moderation')
@UseGuards(AuthGuard, ModeratorGuard) // MODERATOR+
export class ModerationController {
  @Post('action')
  async applyAction(@Body() dto: ActionDto) { ... }

  @Get('reports')
  async getReports() { ... }

  @Delete('action/:id')
  @UseGuards(SuperAdminGuard) // Override : SUPER_ADMIN uniquement
  async revokeAction(@Param('id') id: string) { ... }
}
```

#### Administration
```typescript
@Controller('admin')
export class AdminController {
  @Get('users')
  @UseGuards(AuthGuard, AdminOnlyGuard) // ADMIN+
  async listUsers() { ... }

  @Put('user/:id/role')
  @UseGuards(AuthGuard, AdminOnlyGuard) // ADMIN+
  async updateRole(@Param('id') id: string) { ... }

  @Delete('admin/:id')
  @UseGuards(AuthGuard, SuperAdminGuard) // SUPER_ADMIN uniquement
  async removeAdmin(@Param('id') id: string) { ... }
}
```

---

## 🔧 Dépannage

### Erreur : UnauthorizedException
**Message** : "Token d'accès manquant"

**Cause** : Header Authorization absent ou mal formaté

**Solution** :
```typescript
// ✅ CORRECT
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}

// ❌ INCORRECT
headers: {
  'Authorization': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Manque "Bearer"
}
```

---

### Erreur : UnauthorizedException
**Message** : "Session invalide ou expirée"

**Cause** : JWT valide mais session supprimée ou expirée en DB

**Solution** :
1. Vérifier que la session existe : `SELECT * FROM Session WHERE token = '...'`
2. Vérifier expiresAt > NOW()
3. Si session expirée : utiliser `/auth/refresh` pour renouveler

---

### Erreur : ForbiddenException
**Message** : "Accès réservé aux modérateurs..."

**Cause** : Rôle utilisateur insuffisant

**Solution** :
1. Vérifier le rôle : `SELECT role FROM User WHERE id = '...'`
2. Si USER et endpoint nécessite MODERATOR : demander élévation de privilèges
3. Si MODERATOR et endpoint nécessite ADMIN : demander à un ADMIN

---

### Erreur : Module Not Found
**Message** : "Cannot find module '../auth/guards/role.guards'"

**Cause** : Import incorrect

**Solution** :
```typescript
// ✅ CORRECT
import { ModeratorGuard } from '../auth/guards/role.guards';

// ❌ INCORRECT
import { ModeratorGuard } from './role.guards'; // Chemin relatif incorrect
```

---

### Guard Ne Fonctionne Pas
**Symptôme** : Endpoint accessible sans authentification

**Vérifications** :
1. `@UseGuards()` présent sur la méthode ou le contrôleur
2. Guard importé correctement
3. Guard exporté dans le module :
```typescript
// auth.module.ts
providers: [AuthService, AuthGuard, AdminGuard],
exports: [AuthService, AuthGuard, AdminGuard], // ✅ EXPORTER
```

---

## 📊 Résumé Rapide

| Guard | Rôles Autorisés | Usage Principal |
|-------|-----------------|-----------------|
| `AuthGuard` | Tous authentifiés | Vérification JWT/Session |
| `AdminGuard` | MODERATOR, ADMIN, SUPER_ADMIN | Modération + Admin (legacy) |
| `ModeratorGuard` | MODERATOR, ADMIN, SUPER_ADMIN | Modération (recommandé) |
| `AdminOnlyGuard` | ADMIN, SUPER_ADMIN | Gestion utilisateurs |
| `SuperAdminGuard` | SUPER_ADMIN | Actions critiques |

---

**Version** : 2.1.0  
**Date** : 7 octobre 2025  
**Auteur** : GitHub Copilot  
**Statut** : ✅ Production Ready
