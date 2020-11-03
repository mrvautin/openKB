# Veda-KB
![logo](vedakb_logo_small.png)
## Installation sur Heroku

Ce bouton permet de faire une installation initiale dans Heroku de openKB.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mrvautin/openKB)

Configurer ensuite les déploiements automatiques dans Heroku, provenant de votre propre fork.

## Limitations dûes à Heroku

Les dyno de Heroku sont des Containers *Stateless*: les fichiers sont supprimés ou remis à leur état initial toutes les heures environ.
* La configuration faite par le menu **Admin** n'est donc pas perenne.
* Les images ou fichiers insérés dans les articles ne sont pas conservés.



## Base mongoDB

On peut ouvrir une base de données *mongoDB* sur le site  [mongodb.com](https://www.mongodb.com), avec le *free plan*. Cela se fait en quelques étapes:

* Créer un *cluster*, et lui donner un nom.
* Créer un user *administrateur* (par ex: mongo_admin)
* Créer un user *utilisateur* (par exemple: mongo_user)
* Dans *Cluster*, cliquer sur le bouton `connect`: cela va afficher la chaine de connection qu'il faudra configurer dans **heroku** dans une `Config Var` nommée **MONGODB_CONNECTION_STRING**, après avoir remplacer les champs prévus par `mongo_user`, son mot de passe, et le nom donné à la base de données.



Note: Dans la page web de mongodb.com, on peut consulter le contenu de notre base de données.