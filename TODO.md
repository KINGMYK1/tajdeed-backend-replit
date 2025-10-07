# 📋 TODO - Tajdeed Backend

## 🚀 En cours / Priorité haute

- [ ] **Tester tous les endpoints** avec Postman/curl
  - [ ] POST /auth/register
  - [ ] POST /auth/verify-email
  - [ ] POST /auth/login
  - [ ] GET /auth/me
  - [ ] POST /auth/forgot-password
  - [ ] POST /auth/reset-password
  - [ ] POST /moderation/action (admin)

- [ ] **Configurer service email production**
  - [ ] Créer compte SendGrid ou Mailgun
  - [ ] Mettre à jour .env avec vraies credentials
  - [ ] Tester envoi emails réels

- [ ] **Sécurité production**
  - [ ] Changer mot de passe admin MYK@123
  - [ ] Générer JWT_SECRET sécurisé (32+ chars)
  - [ ] Activer HTTPS
  - [ ] Configurer CORS restrictif
  - [ ] Activer rate limiting

## 📋 Fonctionnalités à ajouter

### Authentication
- [ ] Ajouter 2FA (Two-Factor Authentication)
- [ ] OAuth Google (optionnel)
- [ ] OAuth Facebook (optionnel)
- [ ] Logs de connexion (IP, device, date)
- [ ] Détection tentatives suspectes
- [ ] Blocage temporaire après X tentatives échouées

### Modération
- [ ] Dashboard admin avec statistiques
- [ ] Système de notifications pour modérateurs
- [ ] Export des actions de modération (CSV)
- [ ] Historique complet des actions
- [ ] Appel de décisions de modération

### Users
- [ ] CRUD complet utilisateurs
- [ ] Upload avatar
- [ ] Préférences utilisateur
- [ ] Historique d'activité
- [ ] Suppression de compte (RGPD)
- [ ] Export données personnelles (RGPD)

### Marketplace (future)
- [ ] Module Produits
- [ ] Module Commandes
- [ ] Module Paiements (Stripe/PayPal)
- [ ] Module Messages
- [ ] Module Avis/Notes
- [ ] Module Recherche

## 🧪 Tests

- [ ] Corriger tests E2E (auth-code.e2e-spec.ts)
- [ ] Augmenter couverture tests unitaires (>80%)
- [ ] Ajouter tests pour moderation
- [ ] Tests de charge (k6 ou Artillery)
- [ ] Tests de sécurité (OWASP)

## 📚 Documentation

- [ ] Générer documentation API avec Swagger
- [ ] Documenter flows d'authentification (diagrammes)
- [ ] Guide intégration frontend (React/Vue)
- [ ] Guide déploiement production
- [ ] Vidéos tutoriels

## 🔧 DevOps

- [ ] CI/CD avec GitHub Actions
- [ ] Docker Compose pour dev local
- [ ] Déploiement Vercel/Railway/Render
- [ ] Monitoring (Sentry, DataDog)
- [ ] Logs centralisés (CloudWatch, Papertrail)
- [ ] Backup automatique DB
- [ ] Health check endpoint

## � Bugs connus

- [ ] Tests E2E à corriger (types supertest)
- [ ] Améliorer gestion erreurs génériques
- [ ] Valider tous les codes d'erreur HTTP

## 💡 Améliorations

### Performance
- [ ] Cache Redis pour sessions
- [ ] Optimisation requêtes Prisma
- [ ] Compression gzip/brotli
- [ ] CDN pour assets statiques

### Code Quality
- [ ] Refactoring services (découpage)
- [ ] Ajouter plus de types stricts
- [ ] Documenter toutes les méthodes
- [ ] Extraire configurations en fichiers

### UX
- [ ] Templates email plus beaux (HTML)
- [ ] Support multilingue (i18n)
- [ ] Messages d'erreur plus clairs
- [ ] Personnalisation emails (logo, couleurs)

## ✅ Terminé (v2.0.0)

- [x] Migration vers système codes 6 chiffres
- [x] Suppression Google Auth
- [x] Système d'authentification complet
- [x] Système de modération
- [x] Gestion des admins (MYK/MYK@123)
- [x] Configuration Prisma + JWT
- [x] Service email (Nodemailer)
- [x] Résolution erreurs serveur
- [x] Documentation README, TODO, CHANGELOG, MANUEL

---

## 🔄 Workflow de développement

### 1. Réception d'une tâche
- [ ] Ajouter la tâche dans la section "En cours"
- [ ] Décomposer en sous-tâches si nécessaire
- [ ] Estimer la complexité

### 2. Développement
- [ ] Suivre les étapes définies
- [ ] Faire les modifications nécessaires
- [ ] Tester les changements

### 3. Documentation
- [ ] Mettre à jour le CHANGELOG.md avec les modifications
- [ ] Cocher les tâches terminées dans TODO.md
- [ ] Documenter les nouveaux features si nécessaire

### 4. Validation
- [ ] Vérifier que tout fonctionne
- [ ] Exécuter les tests
- [ ] Valider avec l'utilisateur

---

## 📝 Notes

- **Format des tâches** : `- [ ] **Titre** - Description`
- **Priorités** : Haute > Moyenne > Basse
- **Status** : En cours > À faire > Backlog > Terminé
- **Mise à jour** : Automatique à chaque modification

---

*Dernière mise à jour : 1 octobre 2025*