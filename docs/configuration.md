# Veda-KB
![logo](vedakb_logo_small.png)
## Configuration
A la première utilisation, un formulaire s'affiche pour créer un premier utilisateur (administrateur).

La configuration se fait manuellement dans le fichier `/config/config.json`. on *commite* et on *push* le fichier modifié dans GitHub. Il est détecté par Heroku, qui le prend en compte et rebuilde l'application.

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


### Stockage  des données

L'application **openKB** utilise une base de données.
Cette database peut être:
* Soit une base [nedb](https://github.com/louischatriot/nedb) sous forme de fichiers javascript locaux, qui ne nécessite aucune installation particulière, mais ne fonctionne pas dans un hébergement de type heroku.
* Soit une base MongoDB [mLab](https://mlab.com/) ou [Atlas](https://www.mongodb.com/cloud/atlas). 
  Jusqu'en 2020, heroku fournissait un add-on **MongoDB** que l'on pouvait activer et utiliser. Depuis 2020, ce n'est plus disponible. 
  Il faut donc ouvrir une base *MongoDB*, par exemple avec le *free plan* de [mongodb.com](http://www.mongodb.com) et modifier l'application javascript ([voir le change-log](changelog.md)).

Le type de BDD se configure dans le fichier de configuration `config.json` comme suit:

* Pour une base **NeDB**:

```json
"database": {
    "type": "embedded"
}
```

* Pour une base **mongoDB**:

```json
"database": {
    "type": "mongodb",
    "connection_string": "mongodb://127.0.0.1:27017/openkb"
}
```

La chaine de connexion peut être entrée dans le fichier de configuration (peu sûr) ou dans la variable d'environnement `MONGODB_CONNECTION_STRING` (recommandé) qui est configurable dans **heroku**.

* Format d'une chaine de connexion *mongoDB*:
```
mongodb://<username>:<password>@<url>/<database>
```

* Chaine de connexion pour une base *mongoDB* de **heroku.com**:
```
mongodb://heroku_d2db22sn:<password>@ds233763.mlab.com:33763/heroku_d2db22sn
```

* Chaine de connexion pour une base *mongoDB* de **mongodb.com**:
```
mongodb+srv://mongo_user:<password>@openkb.whpvt.mongodb.net/openkb?retryWrites=true&w=majority
```
