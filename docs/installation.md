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

