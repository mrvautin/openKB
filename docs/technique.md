# Veda-KB
![logo](vedakb_logo_small.png)
## L'application openKB

L'application openKB est developpée par [Mark Vautin](https://github.com/mrvautin) et est disponible sur [GitHub](https://github.com/mrvautin/openKB).

Elle est développée sous [Nodejs](https://nodejs.org/) et [ExpressJS](http://expressjs.com/) et utilise le moteur de recherche [Lunr.js](https://github.com/olivernn/lunr.js/).

Elle utilise une base de données ([nedb](https://github.com/louischatriot/nedb)) (sous forme de fichier local) ou une base [MongoDB](https://www.mongodb.com) 
(par configuration. Voir plus bas). 

Demo: [http://openkb.markmoffat.com](http://openkb.markmoffat.com)

![Screenshot](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_homepage_.png)

## Recherche dynamique

Le champ de recherche est dynamique, c'est à dire que les resultats s'affinent au fur et à mesure que vous tapez du texte dans le champ de recheche. Si le nombre d'entrées dans la base de connaissance est élevée, cette fonctionnalité peut ralentir l'application. On peut alors la désactiver dans le fichier de configuration.

## API publique

Une API publique existe qui permet d'ajouter des articles cia HTTP POST. Dans Veda-KB, elle est desactivée.