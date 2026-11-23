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

La version installée et sa date sont affichées dans le pied de page, toujours visible en bas de la fenêtre.

### Versions bêta
Par défaut, vous ne recevez que les versions normales. Pour tester les nouveautés en avant-première, cochez **Recevoir les versions bêta** dans les ⚙️ Paramètres : les versions bêta (par exemple `1.0.15-beta.1`) vous seront alors proposées. Décocher la case ne revient pas en arrière : vous repasserez sur la prochaine version normale.

Le bouton **🔄 Rechercher une mise à jour** des Paramètres lance la recherche tout de suite (sur la voie bêta si la case est cochée) et indique si vous avez déjà la dernière version.

---

## 🚀 Fonctionnalités

### Vos chaînes modérées
- **Détection automatique** de toutes les chaînes où vous êtes modérateur, plus **votre propre chaîne** (badge « Ma chaîne »).
- **Statut en direct** : titre du live, jeu, nombre de spectateurs et avatar du streamer.
- **Recherche** par chaîne ou par jeu, **filtres** *Toutes / En direct / Hors ligne*, **tri** *En direct d'abord / Spectateurs / Nom (A-Z, Z-A)*.
- **Actualisation automatique** des statuts (intervalle réglable dans les Paramètres).
- Trois boutons sur chaque carte : **Gérer** (écran de modération), **Stream** (ouvre le live sur Twitch) et **Chat** (ouvre le chat dans une fenêtre détachée).
- **Plusieurs chaînes en onglets** : **Gérer** ouvre la chaîne dans un **onglet**, sous l'en-tête. Ouvrez-en autant que vous voulez et passez de l'une à l'autre d'un clic ; l'onglet **📋 Chaînes** ramène à la liste.
  - Les onglets restent chargés en arrière-plan (stream, chat, actions en direct) ; seul le son de l'onglet affiché est joué.
  - Un point rouge signale les chaînes en direct.
  - **×** ou le **clic molette** ferme un onglet ; recliquer sur **Gérer** pour une chaîne déjà ouverte affiche son onglet et recharge son historique.
  - Ouvrir les ⚙️ Paramètres ramène à la liste des chaînes.
  - Si vous **perdez le rôle de modérateur** sur une chaîne, son onglet se ferme à la prochaine actualisation de la liste (automatique, ou bouton 🔄).

### Écran de modération
L'écran s'adapte à **vos droits sur chaque chaîne** : une fonction que vous n'avez pas le droit d'utiliser n'est pas affichée (ni son panneau, ni son entrée dans le menu ＋ Panneaux).

La ligne **Droits actifs sur cette chaîne** affiche chaque droit en **vert ✅** s'il est autorisé et en **rouge ❌** sinon.

Les panneaux se réorganisent en les faisant glisser **par leur barre d'en-tête** ; leur taille, leur ordre et leur affichage sont enregistrés.
- **Placement libre** : posez un panneau **n'importe où dans la grille, tant qu'il y a la place**, même en laissant des espaces vides. Pendant le déplacement, un cadre montre l'emplacement : **violet** s'il est libre, **rouge** s'il est occupé (le panneau ne bouge pas si vous le lâchez là).
- Un panneau qui s'agrandit ou s'élargit repousse vers le bas ceux qu'il chevauche.
- Le panneau tenu **suit la souris** ; la **molette** fait défiler la page pendant le déplacement pour l'emmener plus bas ou plus haut.
- Le déplacement fonctionne aussi au-dessus du stream et du chat intégrés ; **Échap** annule le déplacement.
- Dans une fenêtre étroite (moins de 1100 px), les panneaux s'empilent sur toute la largeur.

- **Stream et chat intégrés** côte à côte.
- **Sanctions** : timeout ou ban d'un pseudo, avec motif ; le bouton **✅ Débannir** lève le ban ou l'exclusion du pseudo saisi.
- **Purge du chat** et **mode bouclier**.
- **Paramètres du chat** : mode lent, abonnés, émotes uniquement, followers.
- **Liste des spectateurs** présents dans le chat, avec recherche.
- **Actions de Modérateur** : raids, VIP, modérateurs, bans, exclusions, messages supprimés, avertissements, modes du chat…, avec le pseudo concerné, l'auteur et la date (« hier », « il y a 3 jours »), et un filtre de recherche.
  - **À chaque clic sur Gérer**, les **100 dernières actions** de la chaîne sont rechargées depuis Twitch, comme dans la Mod View, y compris celles faites quand l'application était fermée.
  - Les nouvelles actions s'ajoutent ensuite **en direct**.
  - *Il faut s'être connecté une fois à Twitch dans l'onglet **Vue Twitch officielle** : l'historique utilise cette session. Il passe par une API interne de Twitch, non officielle, qui peut cesser de fonctionner si Twitch la modifie ; l'application garde alors les actions reçues en direct.*
- Onglet **Vue Twitch officielle** : la Mod View de Twitch directement dans l'application.

### Rôle éditeur de chaîne
Panneau affiché seulement si vous êtes éditeur de la chaîne : modifier le **titre**, le **jeu**, les **tags**, lancer une **coupure publicitaire** et créer un **marqueur** de stream.

Sur la chaîne d'un **autre streamer**, l'API officielle de Twitch réserve ces actions au propriétaire : le titre, la catégorie, les tags et les **pubs** passent alors par la session de l'onglet **Vue Twitch officielle** (il faut s'y être connecté une fois), comme le fait le Gestionnaire de stream de twitch.tv. *C'est une API interne de Twitch, non officielle, qui peut cesser de fonctionner si Twitch la modifie.*

Tant que Twitch bloque les pubs (délai entre deux pubs, souvent 8 minutes), les boutons de pub sont **grisés et hachurés** et un **compte à rebours orange** indique quand la prochaine sera possible.

Le rôle est vérifié chaîne par chaîne auprès de Twitch. Si la chaîne n'a encore **aucune VOD**, Twitch ne permet pas de le confirmer : le panneau est alors masqué, comme pour un non-éditeur.

### Prédictions
- Sur **votre propre chaîne** : créer une prédiction, la verrouiller, choisir le gagnant ou l'annuler, et consulter l'historique.
- Sur la chaîne d'un **autre streamer** : les mêmes actions, directement dans le panneau. L'API officielle réservant les prédictions au propriétaire, elles passent par la session de l'onglet **Vue Twitch officielle** (il faut s'y être connecté une fois), comme la Mod View de twitch.tv. *API interne de Twitch, non officielle, qui peut cesser de fonctionner si Twitch la modifie.*
- Le temps de vote restant défile en direct ; à la fin, Twitch verrouille la prédiction tout seul et le panneau se met à jour pour proposer le choix du gagnant.
- Le panneau reprend le style du reste de l'application : choix en **bleu** et **rose** comme sur Twitch, barres de points et de votants, état en pastille (votes ouverts, verrouillée, résolue, annulée), et un formulaire « ＋ Nouvelle » pour la question, les choix et la durée du vote.

### ⚙️ Paramètres
Bouton **⚙️** en haut à droite :
- **Actualisation automatique des chaînes** : une case à cocher pour l'activer ou la désactiver, et un curseur pour choisir l'intervalle, de **30 à 120 secondes** par pas de 15 (30 s par défaut).
- **Thème** : 🌙 **Sombre** (par défaut) ou ☀️ **Clair**. Le changement est immédiat ; le chat Twitch intégré prend le thème à sa prochaine ouverture.

- **Recevoir les versions bêta** : voir [Versions bêta](#versions-bêta).

Les choix sont enregistrés et retrouvés au prochain démarrage.

---

## 🔐 Sécurité et vie privée

- **Connexion officielle Twitch (OAuth)** : votre mot de passe n'est jamais saisi dans l'application, l'autorisation se fait dans votre navigateur.
- La session est enregistrée uniquement sur votre PC, dans `%APPDATA%\twitch-mod-manager\data`. Le bouton **Déconnexion** la supprime.
- La session twitch.tv de la **Vue Twitch officielle** sert aussi à lire l'historique des Actions de Modérateur et à modifier les infos, lancer une pub ou gérer les prédictions sur la chaîne d'un autre streamer ; elle reste dans l'application et n'est envoyée qu'à Twitch.
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

Publier une bêta : `git tag v1.2.3-beta.1; git push origin v1.2.3-beta.1`. La release est marquée « pré-version » et n'est proposée qu'aux applications où la case bêta est cochée.

---

## 📄 Licence

Copyright © 2026 cheche03fr. **Tous droits réservés.**
Le code est visible publiquement mais ne peut être ni copié, ni modifié, ni redistribué sans autorisation écrite. Voir [LICENSE](LICENSE).
