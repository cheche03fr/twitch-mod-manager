# Twitch Mod Manager 🛡️

Application de bureau moderne pour afficher, surveiller et gérer l'ensemble des chaînes Twitch dont vous êtes modérateur.

---

## 🚀 Fonctionnalités

- **Détection automatique** : Récupère la liste complète de toutes les chaînes où vous avez le rôle de modérateur via l'API officielle Twitch (`/helix/moderation/channels`).
- **Statut en direct en temps réel** :
  - Détecte instantanément si une chaîne est **EN DIRECT (LIVE)** ou hors-ligne.
  - Affiche le titre du live, le jeu / catégorie en cours, le nombre de spectateurs en direct et l'avatar du streamer.
- **Accès rapide en 1 clic** :
  - Bouton **Modérer** : Ouvre directement le *Gestionnaire de modération* Twitch (`https://www.twitch.tv/moderator/<chaine>`).
  - Bouton **Stream** : Ouvre le lecteur du stream sur Twitch.
  - Bouton **Chat** : Ouvre la fenêtre de chat détachée (*popout*).
- **Filtres et recherche instantanée** :
  - Filtres par statut : *Toutes*, *En direct*, *Hors ligne*.
  - Recherche instantanée par nom de chaîne ou par jeu.
  - Tri par : *En direct d'abord*, *Spectateurs*, *Nom alphabétique*.
- **Actualisation automatique** :
  - Rafraîchit les statuts toutes les 60 secondes (activable/désactivable d'un clic).
- **Connexion sécurisée (OAuth)** :
  - Authentification officielle Twitch avec le scope `user:read:moderated_channels`.
  - Vos identifiants et mots de passe ne sont jamais saisis dans l'application (l'autorisation se fait directement via votre navigateur par défaut).

---

## 🏁 Comment lancer l'application

1. Double-cliquez simplement sur le fichier **`Lancer.bat`** présent dans ce dossier.
   *(Ou ouvrez un terminal dans ce dossier et tapez : `npm start`)*
2. Sur l'écran d'accueil, cliquez sur **Se connecter avec Twitch**.
3. Votre navigateur habituel s'ouvre sur la page Twitch pour autoriser l'accès.
4. Cliquez sur **Autoriser** : l'application se connecte automatiquement et affiche l'ensemble de vos chaînes !

---

## ⚙️ Configuration Twitch Developer

Si vous souhaitez modifier l'application ou utiliser un autre Client ID :
- Le fichier de configuration se trouve dans [`src/config.js`](file:///c:/Users/cheche/Antigravity/gestion%20de%20moderation/src/config.js).
- Assurez-vous que l'URL de redirection `http://localhost:3000/callback` est bien enregistrée dans les paramètres de votre application sur [Twitch Developer Console](https://dev.twitch.tv/console/apps).
