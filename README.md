# Veda-KB

## Présentation

Cette base de données VEDA est un fork du projet OpenKB de Mark Vautin.
OpenKB est une application de base de connaissances (Knowledge Base) sous forme de FAQ, conçue pour être facile à utiliser et à installer.
Elle est basée sur un moteur de recherche plutot que sur une architecture en catégories: 
Recherchez simplement ce que vous voulez, et choisissez parmi les résultats.


![Screenshot](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_homepage_.png)

### Edition

* L'édition des pages se fait avec la syntaxe [Markdown](http://spec.commonmark.org/).
* On peut activer l'éditeur de graphes [Mermaid](http://knsv.github.io/mermaid/).

## L'application openKB

![logo](https://raw.githubusercontent.com/mrvautin/mrvautin.github.io/master/images/openkb/openkb_logo_small.png)

L'application openKB est developpée par [Mark Vautin](https://github.com/mrvautin) et est disponible sur [GitHub](https://github.com/mrvautin/openKB).

Elle est développée sous [Nodejs](https://nodejs.org/) et [ExpressJS](http://expressjs.com/) et utilise le moteur de recherche [Lunr.js](https://github.com/olivernn/lunr.js/).

Elle utilise une base de données ([nedb](https://github.com/louischatriot/nedb)) (sous forme de fichier local) ou une base [MongoDB](https://www.mongodb.com) (par configuration. Voir plus bas). 

Demo: [http://openkb.markmoffat.com](http://openkb.markmoffat.com)

## Installation sur Heroku

### Deploiement sur Heroku

Ce bouton permet de faire une installation initiale dans Heroku de openKB.
[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/mrvautin/openKB)
Configurer ensuite les déploiements automatiques dans Heroku, provenant de votre propre fork.

### Limitations dûes à Heroku
Les dyno de Heroku sont des Containers *Stateless*: les fichiers sont supprimés ou remis à leur état initial toutes les heures environ.
* La configuration faite par le menu **Admin** n'est donc pas perenne
* Les images ou fichiers insérés dans les articles ne sont pas conservés.

### Configuration

A la première utilisation, un formulaire s'affiche pour créer un premier utilisateur (administrateur).

La configuration se fait manuellement dans le fichier `/config/config.json`.

*Les changements de configuration faits dans le module __Admin__ de l'application ne sont pas persistants.
En effet, les modifications de fichiers locaux sont perdues chaque fois que Heroku réinitialise les containers.*


|Setting|Description|
|--- |--- |
|`route_name`|Sets the value in the URL for viewing an article (defaults to `kb`)|
|`num_top_results`|Sets the number of results shown on the home page|
|`date_format`|Sets the global date formatting. Uses moment.js date formatting, see more here: http://momentjs.com/docs/#/displaying|
|`show_view_count`|Shows the view count next to the results on the homepage and search|
|`update_view_count_logged_in`|Updates the view count if the user is logged in, as well as for anonymous users|
|`show_published_date`|Shows the published date next to the results on the homepage and search|
|`sort_by`|The order to sort articles (1:ascending / -1:descending). You can sort on anything. Examples: `kb_viewcount`,  `kb_published_date`,  `kb_last_updated` or `kb_votes`|
|`website_title`|The title of your website|
|`show_featured_articles`|Whether to show any articles set to featured in a sidebar|
|`show_featured_in_article`|Whether to show any articles set to featured in a sidebar when viewing an article|
|`featured_articles_count`|The number of featured articles shown|
|`theme`|The theme to use for public facing pages. Leave blank for default.|
|`locale`|The language to use for public facing pages. Leave blank for default (English).|
|`password_protect`|Setting to "true" will require a user to login before viewing ANY pages|
|`show_kb_meta`|Whether to show article meta data including published date, last updated date, author etc|
|`suggest_allowed`|If enabled non authenticated users can submit article suggestions for approval|
|`show_author_email`|Controls whether the authors email address is displayed in the meta. Requires "Show article meta data" to be true.|
|`mermaid`|Whether to allow Mermaid charts within articles|
|`mathjax`|Whether to allow MathJax inputs within articles|
|`app_context`|Allows for the website to be run from a non root path. Eg: http://127.0.0.1:4444/openkb/|
|`links_blank_page`|Controls whether links within articles open a new page (tab)|
|`add_header_anchors`|Whether to add HTML anchors to all heading tags for linking within articles or direct linking from other articles|
|`typeahead_search`|Add live typeahead search results on the search inputs|
|`index_article_body`|Whether to add the body of your articles to the search index (requires restart)|
|`show_website_logo`|Controls whether to show the `website_title` text or a logo located: `/public/logo.png` (by default).|
|`website_description`|A short website description when listing the homepage URL in search engines|
|`database`|The database type to use. See **Database setup**|
|`google_analytics`|Adds Google Analytics to public facing pages. Include the entire code from Google including the &lt;script&gt; tags.|
|`style`|Add any Hex color codes, HTML color names and fonts to style the public pages of your KB.|


### Base de données

L'application **openKB** utilise une base de données.
Cette database peut être:
* Soit une base [nedb](https://github.com/louischatriot/nedb) sous forme de fichiers javascript locaux, qui ne nécessite aucune installation particulière, mais ne fonctionne pas dans un hébergement de type Heroku.
* Soit une base MongoDB [mLab](https://mlab.com/) ou [Atlas](https://www.mongodb.com/cloud/atlas) (à activer dans Heroku).

Editer le fichier de configuration `config.json` comme suit:

* Pour une base **NeDB**:

``` javascript
"database": {
    "type": "embedded"
}
```

* Pour une base **MongoDB**:

``` javascript
"database": {
    "type": "mongodb",
    "connection_string": "mongodb://127.0.0.1:27017/openkb"
}
```

La chaine de connexion peut être entrée dans le fichier de configuration (peu sûr) ou dans la variable d'environnement ci-dessous (recommandé).
``` javascript
MONGODB_CONNECTION_STRING
```

### Recherche dynamique

Le champ de recherche est dynamique, c'est à dire que les resultats s'affinent au fur et à mesure que vous tapez du texte dans le champ de recheche.
Si le nombre d'entrées dans la base de connaissance est élevée, cette fonctionnalité peut ralentir l'application.
On peut alors la désactiver dans le fichier de configuration.

### API publique

Une API publique existe qui permet d'ajouter des articles cia HTTP POST.
Dans Veda-KB, elle est desactivée.


