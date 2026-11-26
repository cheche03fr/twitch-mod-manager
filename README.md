# Twitch Mod Manager 🛡️

Application de bureau Windows pour voir et modérer, depuis une seule fenêtre, toutes les chaînes Twitch où vous êtes modérateur.

---

## 📥 Installation

1. Téléchargez **`Twitch-Mod-Manager-Setup-x.y.z.exe`** depuis la [dernière version](https://github.com/cheche03fr/twitch-mod-manager/releases/latest).
2. Lancez l'installeur et choisissez le dossier d'installation.
   *Si Windows SmartScreen affiche « Windows a protégé votre ordinateur », cliquez sur **Informations complémentaires** puis **Exécuter quand même** : l'installeur est signé par `cheche03fr` avec un certificat personnel, non reconnu par défaut.*
3. Ouvrez l'application, cliquez sur **Se connecter avec Twitch** et autorisez l'accès dans votre navigateur. Aux démarrages suivants, ce bouton réutilise la session enregistrée, sans repasser par le navigateur ; activez **Connexion automatique au démarrage** dans les ⚙️ Paramètres pour ouvrir directement vos chaînes.

### Mises à jour automatiques

Au démarrage, l'application vérifie s'il existe une nouvelle version et la télécharge en arrière-plan. Une fenêtre vous propose alors **Installer maintenant** ou **Plus tard** : rien n'est installé sans votre accord.

Avec **Mises à jour automatiques** activé dans les ⚙️ Paramètres :
- la mise à jour se télécharge sans question, puis une **icône de mise à jour** violette (flèches en cercle autour d'une flèche de téléchargement, avec une pastille verte) apparaît à côté de ⚙️ : un clic affiche l'écran « Mise à jour en cours » (le même qu'au démarrage, avec le logo qui tourne), installe la mise à jour et relance l'application ; son infobulle indique la version ;
- si vous ne l'utilisez pas, elle s'installe au **prochain démarrage**, derrière un écran « Mise à jour en cours », puis l'application s'ouvre d'elle-même dans la nouvelle version.

La version installée et sa date sont affichées dans le pied de page, toujours visible en bas de la fenêtre.

### Versions bêta
Par défaut, vous ne recevez que les versions normales. Pour tester les nouveautés en avant-première, activez **Versions bêta** dans les ⚙️ Paramètres : les versions bêta (par exemple `1.0.15-beta.1`) vous seront alors proposées. Désactiver l'option ne revient pas en arrière : vous repasserez sur la prochaine version normale.

Le bouton **🔄 Rechercher une mise à jour** des Paramètres lance la recherche tout de suite (sur la voie bêta si la case est cochée) et indique si vous avez déjà la dernière version.

---

## 🚀 Fonctionnalités

### Vos chaînes modérées
- **Détection automatique** de toutes les chaînes où vous êtes modérateur, plus **votre propre chaîne** (badge « Ma chaîne »), toujours affichée **en premier**, quel que soit le tri.
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

- **Stream et chat intégrés** côte à côte. Le chat est la page « popout » de twitch.tv, dans la session de la **Vue Twitch officielle** : tout y fonctionne comme sur le site, y compris la liste **Utilisateurs dans le chat**. Elle était refusée par Twitch quand le chat était intégré comme un simple cadre. Pour écrire dans le chat, il faut être connecté dans la Vue Twitch officielle.
- **Sanctions** : timeout ou ban d'un pseudo, avec motif. Le choix **Débannir** (en vert), sous les durées, s'applique comme elles : sélectionnez-le, puis **Appliquer** lève le ban ou l'exclusion du pseudo saisi.
- **Purge du chat** et **mode bouclier**.
- **Paramètres du chat** : mode lent, abonnés, émotes uniquement, followers.
- **Liste des spectateurs** présents dans le chat, avec recherche.
- **Actions de Modérateur** : raids, VIP, modérateurs, bans, exclusions, messages supprimés, avertissements, modes du chat…, avec le pseudo concerné, l'auteur et la date (« hier », « il y a 3 jours »), et un filtre de recherche.
  - **À chaque clic sur Gérer**, les **100 dernières actions** de la chaîne sont rechargées depuis Twitch, comme dans la Mod View, y compris celles faites quand l'application était fermée.
  - Les nouvelles actions s'ajoutent ensuite **en direct**.
  - *Il faut s'être connecté une fois à Twitch dans l'onglet **Vue Twitch officielle** : l'historique utilise cette session. Il passe par une API interne de Twitch, non officielle, qui peut cesser de fonctionner si Twitch la modifie ; l'application garde alors les actions reçues en direct.*
- Panneau **💬 Chuchotements** : tes conversations Twitch (les plus récentes en premier, avec les messages non lus), la lecture d'une conversation, l'envoi d'un chuchotement, et les chuchotements reçus qui arrivent **en direct**. Le champ « Pseudo à qui chuchoter » démarre une nouvelle conversation ; un clic sur un pseudo du panneau **Communauté** le remplit, comme il remplit la cible des Actions Rapides.
  - L'historique passe par la session de la **Vue Twitch officielle** (API interne de Twitch, non officielle) ; seuls les 20 derniers messages d'une conversation sont affichés.
- Panneau **🎁 Points de chaîne**, sur ta chaîne comme sur celles que tu modères :
  - la **file des demandes** de récompenses (récompense, spectateur, message éventuel), avec **✓ Valider** ou **↩ Refuser**, qui rend les points au spectateur ; une pastille indique le nombre de demandes en attente ;
  - l'**historique en direct** : chaque nouvelle demande et chaque demande traitée depuis l'app s'y ajoutent. La file est relue toutes les 15 secondes.
  - *Utilise la session de la **Vue Twitch officielle** (API interne de Twitch, non officielle). Les récompenses validées automatiquement par Twitch (sans passer par la file) n'apparaissent pas, et seules les 50 plus anciennes demandes sont affichées.*
  - L'envoi et la réception en direct passent par l'API officielle : il faut s'être **reconnecté** une fois après la mise à jour, et Twitch exige un **numéro de téléphone vérifié** sur ton compte. Limites de Twitch : 40 destinataires différents par jour, 100 messages par minute, 500 caractères pour un premier message.
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
Bouton **⚙️** en haut à droite. Chaque option est un bouton, dans le même style que les durées de sanction : **violet** quand elle est activée, gris sinon.
- **Connexion automatique au démarrage** (désactivée par défaut) : activée, l'application ouvre directement vos chaînes sans afficher la page de connexion ; désactivée, la page de connexion s'affiche à chaque démarrage.
- **Actualisation automatique** des chaînes, et un **curseur** violet pour choisir l'intervalle, de **30 à 120 secondes** par pas de 15 (30 s par défaut) ; la valeur s'affiche à côté.
- **Thème** : 🌙 **Sombre** (par défaut) ou ☀️ **Clair**. Le changement est immédiat ; le chat Twitch intégré prend le thème à sa prochaine ouverture.
- **Versions bêta** : voir [Versions bêta](#versions-bêta). **Mises à jour automatiques** : voir [Mises à jour automatiques](#mises-à-jour-automatiques). Le bouton **Rechercher une mise à jour** (avec le logo de mise à jour, qui tourne pendant la recherche) lance la recherche tout de suite.

Les choix sont enregistrés et retrouvés au prochain démarrage.

---

## 🔐 Sécurité et vie privée

- **Connexion officielle Twitch (OAuth)** : votre mot de passe n'est jamais saisi dans l'application, l'autorisation se fait dans votre navigateur.
- La session est enregistrée uniquement sur votre PC, dans `%APPDATA%\twitch-mod-manager\data`, **chiffrée par Windows** et liée à votre compte Windows (une session déjà enregistrée en clair est chiffrée au prochain démarrage). Le bouton **Déconnexion** la supprime.
- Moteur **Electron 45** à jour des correctifs de sécurité de Chromium.
- Les sites intégrés (twitch.tv) ne reçoivent **aucune permission** (caméra, micro, notifications…), sauf le plein écran et la copie dans le presse-papiers.
- La **Vue Twitch officielle** reste sur twitch.tv : un lien vers un autre site s'ouvre dans votre navigateur.
- La session twitch.tv de la **Vue Twitch officielle** sert aussi à lire l'historique des Actions de Modérateur et à modifier les infos, lancer une pub ou gérer les prédictions sur la chaîne d'un autre streamer, ainsi que la file des points de chaîne ; elle reste dans l'application et n'est envoyée qu'à Twitch.
- L'application ne demande que les autorisations nécessaires : lecture des chaînes modérées et des spectateurs, sanctions, messages et paramètres du chat, mode bouclier, informations de la chaîne, éditeurs, publicités et prédictions, et lecture des VIP, modérateurs, avertissements, termes bloqués et demandes de débannissement (pour les Actions de Modérateur), et envoi et réception des chuchotements.
- Après une mise à jour qui ajoute une autorisation, l'application vous demande de vous **déconnecter puis reconnecter** une fois.
- Le petit serveur interne (connexion Twitch et pages de l'app) n'écoute que sur votre PC (`127.0.0.1`) et ne sert que les fichiers de l'application.
- **Compilation** : les actions GitHub, à jour (Node.js 24), sont figées par empreinte, la compilation n'a qu'un accès en lecture au dépôt, et seule l'étape finale, qui n'installe aucune dépendance, peut créer la release. Le certificat de signature n'est donné qu'à l'étape de signature.

---

## 🧑‍💻 Développement (propriétaire uniquement)

```powershell
npm install
npm start        # ou double-clic sur Lancer.bat
npm test
```

L'historique complet du développement, version par version, est dans le [📓 Devlog](DEVLOG.md).

Organisation du code :
- **Processus principal** : `main.js` (fenêtre, onglets, connexion, mises à jour), `ipcTwitch.js` (tous les échanges `twitch:*` avec la page, avec vérification commune de la session et des identifiants), `twitchService.js` (API officielle Helix, via une fonction commune `helix()`), `twitchModLog.js` / `twitchChannelEdit.js` / `twitchPredictions.js` / `twitchWhispers.js` / `twitchChannelPoints.js` (API interne de Twitch, via `runTwitchGql()`), `updater.js`, `authManager.js` + `sessionSeal.js`.
- **Page** (`src/renderer/`) : `renderer.js` (état, éléments, démarrage, utilitaires comme `setFeedback`), puis un fichier par partie : `channelList.js`, `channelTabs.js`, `gridCustomization.js`, `moderationPanel.js`, `editorPanel.js`, `settingsPanel.js`, `predictionsPanel.js`, `whispersPanel.js`, `channelPointsPanel.js`.

L'application tourne sur **Electron 45** (Chromium 156). Depuis Electron 42, le programme Electron est téléchargé au premier lancement de `npm start`, et non plus pendant `npm install`.

Publier une version : `git tag v1.2.3; git push origin v1.2.3`. GitHub Actions compile et signe l'installeur (job `build`), puis crée la release (job `release`) ; les applications installées se mettent à jour automatiquement.

Publier une bêta : `git tag v1.2.3-beta.1; git push origin v1.2.3-beta.1`. La release est marquée « pré-version » et n'est proposée qu'aux applications où la case bêta est cochée.

---

## 📄 Licence

Copyright © 2026 cheche03fr. **Tous droits réservés.**
Le code est visible publiquement mais ne peut être ni copié, ni modifié, ni redistribué sans autorisation écrite. Voir [LICENSE](LICENSE).
