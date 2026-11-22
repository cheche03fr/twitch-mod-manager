# Twitch Mod Manager 🛡️

Application de bureau Windows pour voir et modérer, depuis une seule fenêtre, toutes les chaînes Twitch où vous êtes modérateur.

---

## 📥 Installation

1. Téléchargez **`Twitch-Mod-Manager-Setup-x.y.z.exe`** depuis la [dernière version](https://github.com/cheche03fr/twitch-mod-manager/releases/latest).
2. Lancez l'installeur et choisissez le dossier d'installation.
   *Si Windows SmartScreen affiche « Windows a protégé votre ordinateur », cliquez sur **Informations complémentaires** puis **Exécuter quand même** : l'installeur est signé par `cheche03fr` avec un certificat personnel, non reconnu par défaut.*
3. Ouvrez l'application, cliquez sur **Se connecter avec Twitch** et autorisez l'accès dans votre navigateur.

### Mises à jour automatiques

Au démarrage, l'application vérifie s'il existe une nouvelle version et la télécharge en arrière-plan. Une fenêtre vous propose alors **Installer maintenant** ou **Plus tard** : rien n'est installé sans votre accord.

La version installée et sa date sont affichées en bas de la fenêtre.

---

## 🚀 Fonctionnalités

### Vos chaînes modérées
- **Détection automatique** de toutes les chaînes où vous êtes modérateur.
- **Statut en direct** : titre du live, jeu, nombre de spectateurs et avatar du streamer.
- **Recherche** par chaîne ou par jeu, **filtres** *Toutes / En direct / Hors ligne*, **tri** *En direct d'abord / Spectateurs / Nom (A-Z, Z-A)*.
- **Actualisation automatique** des statuts (intervalle réglable dans les Paramètres).
- Trois boutons sur chaque carte : **Gérer** (écran de modération), **Stream** (ouvre le live sur Twitch) et **Chat** (ouvre le chat dans une fenêtre détachée).

### Écran de modération
L'écran s'adapte à **vos droits sur chaque chaîne** : une fonction que vous n'avez pas le droit d'utiliser n'est pas affichée (ni son panneau, ni son entrée dans le menu ＋ Panneaux).

- **Stream et chat intégrés** côte à côte.
- **Sanctions** : timeout ou ban d'un pseudo, avec motif.
- **Purge du chat** et **mode bouclier**.
- **Paramètres du chat** : mode lent, abonnés, émotes uniquement, followers.
- **Liste des spectateurs** présents dans le chat, avec recherche.
- **Actions de Modérateur** : raids, VIP, modérateurs, bans, exclusions, messages supprimés, avertissements, modes du chat… envoyés en direct par Twitch, avec le pseudo concerné, l'auteur et la date (« hier », « il y a 3 jours »). Les 100 dernières actions de chaque chaîne sont conservées, avec un filtre de recherche.
  *Twitch ne donne pas accès aux actions passées : l'historique se remplit tant que l'application est ouverte (pour toutes vos chaînes modérées, même sans ouvrir leur écran).*
- Onglet **Vue Twitch officielle** : la Mod View de Twitch directement dans l'application.

### Rôle éditeur de chaîne
Panneau affiché seulement si vous êtes éditeur de la chaîne : modifier le **titre**, le **jeu**, les **tags**, lancer une **coupure publicitaire** et créer un **marqueur** de stream.

### Prédictions
Panneau affiché seulement sur **votre propre chaîne** (l'API Twitch réserve les prédictions au propriétaire) : créer une prédiction, la verrouiller, choisir le gagnant ou l'annuler, et consulter l'historique. Sur la chaîne d'un autre streamer, utilisez l'onglet **Vue Twitch officielle**.

### ⚙️ Paramètres
Bouton **⚙️** en haut à droite :
- **Actualisation automatique des chaînes** : une case à cocher pour l'activer ou la désactiver, et un curseur pour choisir l'intervalle, de **30 à 120 secondes** par pas de 15 (30 s par défaut).
- **Thème** : 🌙 **Sombre** (par défaut) ou ☀️ **Clair**. Le changement est immédiat ; le chat Twitch intégré prend le thème à sa prochaine ouverture.

Les choix sont enregistrés et retrouvés au prochain démarrage.

---

## 🔐 Sécurité et vie privée

- **Connexion officielle Twitch (OAuth)** : votre mot de passe n'est jamais saisi dans l'application, l'autorisation se fait dans votre navigateur.
- La session est enregistrée uniquement sur votre PC, dans `%APPDATA%\twitch-mod-manager\data`. Le bouton **Déconnexion** la supprime.
- L'application ne demande que les autorisations nécessaires : lecture des chaînes modérées et des spectateurs, sanctions, messages et paramètres du chat, mode bouclier, informations de la chaîne, éditeurs, publicités et prédictions, et lecture des VIP, modérateurs, avertissements, termes bloqués et demandes de débannissement (pour les Actions de Modérateur).
- Après une mise à jour qui ajoute une autorisation, l'application vous demande de vous **déconnecter puis reconnecter** une fois.

---

## 🧑‍💻 Développement (propriétaire uniquement)

```powershell
npm install
npm start        # ou double-clic sur Lancer.bat
npm test
```

Publier une version : `git tag v1.2.3; git push origin v1.2.3`. GitHub Actions compile, signe l'installeur et crée la release ; les applications installées se mettent à jour automatiquement.

---

## 📄 Licence

Copyright © 2026 cheche03fr. **Tous droits réservés.**
Le code est visible publiquement mais ne peut être ni copié, ni modifié, ni redistribué sans autorisation écrite. Voir [LICENSE](LICENSE).
