# 📓 Devlog — Twitch Mod Manager

Journal de développement de **Twitch Mod Manager**, l'application Windows qui réunit dans une seule fenêtre toutes les chaînes Twitch que l'on modère.

> **En chiffres** : 2 jours de développement (22 et 23 novembre 2026), 48 commits, 42 versions publiées (23 normales et 19 bêtas), chaque installeur signé `cheche03fr`.

---

## Sommaire
1. [Les fondations](#1-les-fondations--v100--v107)
2. [Paramètres et écran de modération](#2-paramètres-et-écran-de-modération--v108--v1014)
3. [Versions bêta et sa propre chaîne](#3-versions-bêta-et-sa-propre-chaîne--v1015--v1018)
4. [La grille libre et l'historique Twitch](#4-la-grille-libre-et-lhistorique-twitch--v1019)
5. [Plusieurs chaînes en même temps](#5-plusieurs-chaînes-en-même-temps--v1020-beta1--beta4)
6. [Éditeur, pubs et prédictions chez les autres](#6-éditeur-pubs-et-prédictions-chez-les-autres--v1020-beta5--beta6)
7. [Le contrôle de sécurité](#7-le-contrôle-de-sécurité--v1020--v1021)
8. [Débannir, mises à jour automatiques et finitions](#8-débannir-mises-à-jour-automatiques-et-finitions--v1022--v1023-beta6)
9. [La grande factorisation](#9-la-grande-factorisation--v1023-beta7)
10. [v1.0.23 : la série passe en version normale](#10-v1023--la-série-passe-en-version-normale)
11. [Les chuchotements](#11-les-chuchotements--v1024-beta1)
12. [Leçons techniques](#12-leçons-techniques)
13. [Et après ?](#13-et-après-)

---

## 1. Les fondations — v1.0.0 → v1.0.7
*22 novembre 2026*

Le point de départ : une application **Electron** qui se connecte à Twitch (OAuth), liste toutes les chaînes où l'on est modérateur, avec leur statut en direct, et ouvre pour chacune un **écran de modération** : stream et chat intégrés, sanctions, paramètres du chat, mode bouclier, liste des spectateurs, édition du stream.

- **Distribution** : compilation Windows par **GitHub Actions**, installeur NSIS, et **mises à jour automatiques** depuis les Releases GitHub (electron-updater). Le code et les releases sont regroupés dans un seul dépôt public, sous **licence propriétaire** (tous droits réservés).
- **v1.0.1 – v1.0.4** : une **fenêtre de confirmation** avant d'installer une mise à jour (rien ne s'installe sans accord), et un **pied de page** avec l'auteur, la version et la date de compilation.
- **v1.0.5** : la version de l'application est prise directement du tag de publication.
- **v1.0.6 — premier durcissement de sécurité** : contrôle du paramètre `state` OAuth (un autre site ne peut pas injecter son jeton), navigation de la fenêtre verrouillée, Content Security Policy stricte.
- **v1.0.7** : **signature de l'installeur** avec le certificat `cheche03fr`, directement dans GitHub Actions.

## 2. Paramètres et écran de modération — v1.0.8 → v1.0.14

- **v1.0.8 – v1.0.9** : première fenêtre **⚙️ Paramètres** : actualisation automatique des chaînes (30 à 120 s) et thème **sombre / clair**. Les cartes de chaînes reçoivent leurs boutons **Gérer / Stream / Chat**.
- **v1.0.10** : l'écran de modération **s'adapte aux droits réels** sur chaque chaîne. Chaque droit est testé auprès de Twitch, et ce qui n'est pas autorisé n'est pas affiché.
- **v1.0.11** : les **actions de modération Twitch en direct** (EventSub `channel.moderate` v2) : bans, exclusions, VIP, raids, modes du chat…
- **v1.0.12 – v1.0.13** : le **rôle éditeur** est vérifié chaîne par chaîne. Twitch ne publie la liste des éditeurs qu'au streamer ; l'app lit donc à la place les marqueurs de stream, réservés au streamer et à ses éditeurs. Une chaîne sans VOD ne permet pas de conclure : elle est traitée comme « non éditeur ».
- **v1.0.14** : pied de page toujours visible, et panneaux déplacés par leur barre d'en-tête.

## 3. Versions bêta et sa propre chaîne — v1.0.15 → v1.0.18

- **v1.0.15** : une voie **bêta** au choix dans les Paramètres. Une pré-version (tag `vX-beta.N`) n'est proposée qu'aux apps qui l'ont demandée.
- **v1.0.16** : le bouton **« Rechercher une mise à jour »**.
- **v1.0.17** : **sa propre chaîne** apparaît dans la liste (Twitch ne la compte pas parmi les chaînes modérées).
- **v1.0.18** : sur la chaîne d'un autre streamer, les **prédictions** renvoient vers la Mod View officielle de Twitch, puisque l'API officielle les réserve au propriétaire. C'est le premier signe d'un problème récurrent, résolu au chapitre 6.

## 4. La grille libre et l'historique Twitch — v1.0.19

- **Droits en couleur** : chaque droit s'affiche en **vert ✅** s'il est autorisé, en **rouge ❌** sinon.
- **Placement libre des panneaux** : la grille passe à 12 colonnes et des lignes de 10 px. Un panneau se pose **n'importe où tant qu'il y a la place**, avec un cadre violet (libre) ou rouge (occupé). Les panneaux qui se chevauchent sont repoussés vers le bas.
- Le glisser-déposer natif bloquait la molette sous Windows. Il est remplacé par un déplacement aux **événements pointeur** : le panneau suit la souris, la molette fait défiler la page, Échap annule.
- **Historique Twitch des actions de modération** à chaque clic sur « Gérer » : les **100 dernières actions**, comme dans la Mod View, y compris celles faites quand l'app était fermée. C'est la première utilisation de l'**API GraphQL interne** de Twitch, avec la session de l'onglet « Vue Twitch officielle ».

## 5. Plusieurs chaînes en même temps — v1.0.20-beta.1 → beta.4

- **beta.1** : un bouton **Débannir** dans les Actions Rapides de Modération.
- **beta.2** : plusieurs chaînes ouvertes en même temps, d'abord **chacune dans sa fenêtre**…
- **beta.3** : … puis, à la demande, **en onglets** dans la fenêtre principale. Chaque onglet est une page de l'app (`WebContentsView`) qui reste chargée en arrière-plan, avec stream, chat et actions en direct ; seul l'onglet affiché a le son.
- **beta.4** : l'onglet d'une chaîne **se ferme tout seul** quand on perd le rôle de modérateur.

## 6. Éditeur, pubs et prédictions chez les autres — v1.0.20-beta.5 → beta.6
*23 novembre 2026*

Le problème : l'API officielle de Twitch (Helix) réserve le **titre, la catégorie, les tags, les pubs et les prédictions** au **propriétaire** de la chaîne. Un éditeur ou un modérateur reçoit une erreur 401, alors que le site de Twitch, lui, le permet.

La solution : faire **comme le site de Twitch**. Les vraies requêtes ont été capturées pendant que l'utilisateur faisait l'action dans la Vue Twitch officielle, puis rejouées depuis l'app avec la même session :

| Action | Requête interne |
|---|---|
| Titre, catégorie, langue | `EditBroadcastContext_BroadcastSettingsMutation` |
| Tags | `EditBroadcastContext_FreeformTagsMutation` |
| Lancer une pub | `StartAd` |
| Délai entre deux pubs | `AdFrequencyQuery` |
| Lire les prédictions | `ChannelPointsPredictionContext` |
| Créer / verrouiller / résoudre / annuler | `createPredictionEvent` / `LockPrediction` / `ResolvePrediction` / `DeletePrediction` |

- **beta.5** : modification du stream et pubs sur la chaîne d'un autre. Pendant le **délai entre deux pubs**, les boutons sont grisés et hachurés, avec un compte à rebours orange. Le code `RATE_LIMITED` est traduit en message clair.
- **beta.6** : **prédictions complètes** sur la chaîne d'un autre. Le temps de vote défile en direct et le panneau se recharge quand Twitch verrouille tout seul ; le premier essai réel avait révélé un affichage figé. Le panneau Prédictions est entièrement **redessiné** dans le style de l'app : choix bleu et rose comme sur Twitch, pastilles d'état, historique.

## 7. Le contrôle de sécurité — v1.0.20 → v1.0.21

Un contrôle complet a relevé un point **élevé** et quatre points **moyens ou faibles**, tous corrigés :

- **v1.0.20** (première version normale depuis v1.0.19, avec tout le travail des bêtas) :
  - **aucune permission** n'est accordée aux sites intégrés (caméra, micro, notifications…), sauf le plein écran et le presse-papiers ;
  - la **Vue Twitch officielle ne peut plus quitter twitch.tv** : un lien extérieur s'ouvre dans le navigateur ;
  - le **jeton Twitch est chiffré** par Windows (`safeStorage`, DPAPI) au lieu d'être stocké en clair ; une ancienne session est rechiffrée sans reconnexion ;
  - les attributs HTML venant de Twitch sont échappés.
- **v1.0.21 — Electron 35 → 45** (Chromium 156) : Electron 35 n'était plus maintenu et `npm audit` signalait des failles Chromium. Le passage à la version 45 a aussi imposé l'API **asynchrone** de `safeStorage` : la session est déchiffrée une fois au démarrage puis gardée en mémoire.

Reste un risque accepté et documenté : la signature des mises à jour n'est pas vérifiée par electron-updater, car le certificat est personnel. La protection repose sur l'empreinte sha512 des releases et sur la sécurité du compte GitHub.

## 8. Débannir, mises à jour automatiques et finitions — v1.0.22 → v1.0.23-beta.6

- **v1.0.22** : **« Débannir »** devient un choix comme les durées de sanction, appliqué par le bouton **Appliquer** (gris, texte vert).
- **v1.0.23-beta.1 — Mises à jour automatiques**, au choix dans les Paramètres : téléchargement sans question, puis une icône à côté de ⚙️ pour installer. Si on ne l'utilise pas, la mise à jour s'installe **au prochain démarrage**, derrière un écran « Mise à jour en cours ».
- **beta.2** : **« Connexion automatique au démarrage »**. Désactivée, la page de connexion s'affiche, et « Se connecter avec Twitch » réutilise la session enregistrée sans repasser par le navigateur.
- **beta.3** : une **icône de mise à jour** dessinée aux couleurs de l'app (flèches violettes en cercle autour d'une flèche de téléchargement, avec une pastille verte).
- **beta.4** : les **Paramètres en boutons**, dans le style des durées de sanction : violet quand l'option est active.
- **beta.5** : l'écran « Mise à jour en cours » **avec le logo qui tourne**, affiché aussi quand on clique sur l'icône. Retour d'un **curseur violet** pour l'intervalle d'actualisation, et le logo sur « Rechercher une mise à jour ».
- **beta.6** : **sa propre chaîne toujours en premier** dans la liste, quel que soit le tri.

## 9. La grande factorisation — v1.0.23-beta.7

Aucune nouveauté visible : le code est réorganisé pour rester maintenable.

| Avant | Après |
|---|---|
| `twitchService.js` : 713 lignes, 22 appels Helix écrits à la main | 370 lignes, une fonction commune `helix()` (testée avec un réseau simulé) |
| `main.js` : 788 lignes, 22 gestionnaires IPC qui répètent session, validation et erreurs | 358 lignes ; les échanges `twitch:*` sont dans `ipcTwitch.js`, avec `handleTwitch()` |
| API interne : la même suite « requête → session manquante → erreur » dans 4 fonctions | une fonction commune `runTwitchGql()` |
| `renderer.js` : 2263 lignes | 494 lignes + 7 fichiers par partie (liste, onglets, grille, modération, éditeur, Paramètres, prédictions) |
| 24 messages « ✅ / ❌ » écrits à la main | une fonction `setFeedback()` |

Au passage, l'identifiant de chaîne est désormais **vérifié sur tous les échanges** Twitch, au lieu de 7, et les vérifications des droits se font **en parallèle**.

## 10. v1.0.23 : la série passe en version normale
*23 novembre 2026*

Les sept bêtas 1.0.23 sont réunies dans une **version normale**, proposée à tout le monde (case bêta cochée ou non). Pour ceux qui viennent de la v1.0.22, voici ce qui arrive d'un coup :

- **Mises à jour automatiques** (option des Paramètres) : téléchargement sans question, **icône violette** à côté de ⚙️ pour installer tout de suite, sinon installation au prochain démarrage derrière l'écran **« Mise à jour en cours »** avec le logo qui tourne.
- **Connexion automatique au démarrage** (option des Paramètres) : désactivée par défaut. La page de connexion s'affiche donc au démarrage, et « Se connecter avec Twitch » réutilise la session enregistrée sans repasser par le navigateur.
- **Paramètres redessinés** : options en boutons (violet = activée), curseur violet pour l'intervalle d'actualisation, logo sur « Rechercher une mise à jour ».
- **Sa propre chaîne toujours en premier** dans la liste.
- **Code factorisé** (voir le chapitre 9) : aucun changement visible, mais un code plus court, mieux rangé et mieux testé.

À noter : le nouvel écran au clic sur l'icône de mise à jour ne se verra qu'à la **prochaine** mise à jour, car c'est la version installée qui l'affiche.

## 11. Les chuchotements — v1.0.24-beta.1
*23 novembre 2026*

Un nouveau panneau **💬 Chuchotements** dans la grille, déplaçable comme les autres.

- **Ce que dit l'API officielle** : elle permet d'**envoyer** un chuchotement (`POST /whispers`) et de **recevoir en direct** ceux qui arrivent (EventSub `user.whisper.message`), mais **pas de relire l'historique**. Elle impose aussi un numéro de téléphone vérifié, 40 destinataires différents par jour et 500 caractères pour un premier message.
- **L'historique par l'API interne**, comme pour la modération : les requêtes `Whispers_Whispers_UserWhisperThreads` (liste des conversations) et `Whispers_Thread_WhisperThread` (une conversation) ont été relevées pendant que l'utilisateur ouvrait ses chuchotements dans la Vue Twitch officielle, puis rejouées en lecture seule pour connaître leur forme, contenu masqué. L'identifiant d'une conversation est formé des deux identifiants de compte, du plus petit au plus grand.
- **Le panneau** : liste des conversations (la plus récente en premier, aperçu « Toi : … », date relative, pastille de non-lus), conversation en bulles (les siennes en violet à droite), champ d'envoi, et champ « Pseudo à qui chuchoter » pour en démarrer une. Un chuchotement reçu remonte sa conversation en tête, ou s'ajoute directement si elle est ouverte.
- **Côté technique** : le client EventSub devient générique. Il gère une table d'abonnements (`channel.moderate` par chaîne, `user.whisper.message` pour le compte) au lieu d'une simple liste de chaînes. Les erreurs d'envoi (téléphone non vérifié, destinataire qui refuse, limite atteinte) deviennent des messages clairs.
- **À faire une fois** : se **déconnecter puis se reconnecter**, pour accorder le nouveau droit `user:manage:whispers`. Sans lui, l'historique s'affiche, mais l'envoi et le direct sont indisponibles.

## 12. Leçons techniques

- **Le site de Twitch peut plus que son API officielle.** Pour un éditeur ou un modérateur, la seule voie est l'API GraphQL interne. Les requêtes sont des « requêtes persistées » identifiées par une empreinte, qui peut changer sans prévenir. Chaque empreinte est notée dans le code (`shortcut:`) avec la marche à suivre pour la relever.
- **Capturer plutôt que deviner.** Toutes les requêtes internes ont été relevées en observant le trafic de la Vue Twitch officielle pendant une vraie action faite par l'utilisateur, en lisant seulement le contenu et jamais le jeton.
- **Electron et le glisser-déposer** : sous Windows, le drag & drop natif bloque la molette. Les événements pointeur règlent le problème.
- **Les onglets avec `WebContentsView`** gardent chaque chaîne vivante en arrière-plan. La page principale mesure la zone d'affichage et le processus principal y pose la vue active.
- **Un compte à rebours figé est un bug** : un temps restant calculé une seule fois laissait croire qu'une prédiction était encore ouverte alors que Twitch l'avait déjà verrouillée.
- **Tester sans rien casser en vrai** : aucune action visible n'a été lancée sur les chaînes pendant les tests automatiques (pas de ban, de prédiction ni de pub). Les vraies actions ont été faites par l'utilisateur, et les états d'interface simulés localement.

## 13. Et après ?

- Garder un œil sur les **empreintes des requêtes internes** de Twitch : si une fonction « chez les autres » cesse de marcher, il faudra relever la nouvelle empreinte.
- Les **6 failles moyennes** restantes de `npm audit` concernent uniquement les outils de compilation (electron-builder), pas l'application installée.
- Chaque nouvelle version, bêta ou normale, aura désormais son entrée dans ce devlog.

---

*Twitch Mod Manager — © 2026 cheche03fr, tous droits réservés.*
