# Veda-KB
![logo](docs/vedakb_logo_small.png)
## Présentation

Cette base de données VEDA est un fork du projet OpenKB de Mark Vautin.
OpenKB est une application de base de connaissances (Knowledge Base) sous forme de FAQ, conçue pour être facile à utiliser et à installer. Elle est basée sur un moteur de recherche, plutôt que sur une architecture en catégories:  Recherchez simplement ce que vous voulez, et choisissez parmi les résultats.

* L'édition des pages se fait avec la syntaxe [Markdown](http://spec.commonmark.org/).
* On peut activer l'éditeur de graphes [Mermaid](http://knsv.github.io/mermaid/).

## Installation & Configuration

La description technique de la base de connaissance **openKB** est [ici](docs/technique.md)

Installation sur **Heroku**: voir [ici](docs/installation.md)

Pour la configuration et la customisation: voir [ici](docs/configuration.md)

Pour les modification effectuées dans cette branche: voir le [change_log](docs/changelog.md)

## Gestion des images

*Heroku* ne conserve pas les fichiers qui sont uploadées via l'administration du site (le site est resetté toutes les heures). Pour ajouter une image, il faut donc procéder ainsi:

* Déposer le fichier PNG (ou tout autre fichier, même non-image) dans le repository, dans `public/uploads/inline_files`.
* Faire un `commit` du repository dans GitHub. Cela déclenche un upload du site actualisé vers *Heroku*.
* Dans la page où l'on veut faire apparaitre les fichiers, on insère :
  *  `[Exemple de fichier XML](/uploads/inline_files/exemple.xml)`   : fait apparaître un lien pour télécharger ou ouvrir le fichier.
  *  `![image](http://veda-kb.herokuapp.com/uploads/inline_files/DVE-Play.PNG)` : fait apparaitre une image (on obtient le lien en allant dans `Administrateur` → `Fichiers` → `clic-droit` sur une image → `copier le lien` )
  *  `![image](http://i.stack.imgur.com/N1IGZ.jpg)`  : fait apparaitre une image issue d'un autre site

