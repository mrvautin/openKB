var express = require('express');
var router = express.Router();
var common = require('./common');
var config = common.read_config();

// validate the permalink
router.post('/api/getArticleJson', function(req, res){
    var db = req.app.db;

    db.kb.findOne({_id: common.getId(req.body.kb_id)}, function (err, result){
        if(err){
            res.status(400).json({message: 'Article not found'});
		}else{
            res.status(200).json(result);
		}
	});
});

// validate the permalink
router.post('/api/deleteVersion', function(req, res){
    var db = req.app.db;

    // only allow admin
    if(req.session.is_admin !== 'true'){
        res.status(400).json({message: 'Admin access required'});
        return;
    }

    db.kb.remove({_id: common.getId(req.body.kb_id)}, {}, function (err, numRemoved){
		if(err){
            res.status(400).json({message: 'Article not found'});
		}else{
            res.status(200).json({});
		}
	});
});

// validate the permalink
router.post('/api/validate_permalink', function(req, res){
    var db = req.app.db;
	// if doc id is provided it checks for permalink in any docs other that one provided,
	// else it just checks for any kb's with that permalink
	var query = {};
	if(req.body.doc_id === ''){
		query = {'kb_permalink': req.body.permalink};
	}
    query = {'kb_permalink': req.body.permalink, $not: {_id: req.body.doc_id}};

	db.kb.count(query, function (err, kb){
		if(kb > 0){
            res.writeHead(400, {'Content-Type': 'application/text'});
            res.end('Permalink already exists');
		}else{
			res.writeHead(200, {'Content-Type': 'application/text'});
			res.end('Permalink validated successfully');
		}
	});
});

// public API for inserting posts
router.post('/api/newArticle', function(req, res){
    var db = req.app.db;
    var Validator = require('jsonschema').Validator;
    var v = new Validator();

    // if API is not set or set to false we stop it
    if(typeof config.settings.api_allowed === 'undefined' || config.settings.api_allowed === false){
        res.status(400).json({result: false, errors: ['Not allowed']});
        return;
    }

    // if API token is not set or set to an empty value we stop it. Accidently allowing a public API with no token is no 'toke'.
    if(typeof config.settings.api_auth_token === 'undefined' || config.settings.api_auth_token === ''){
        res.status(400).json({result: false, errors: ['Not allowed']});
        return;
    }

    // The API schema
    var articleSchema = {
        'type': 'object',
        'properties': {
            'api_auth_token': {'type': 'string'},
            'kb_title': {'type': 'string'},
            'kb_body': {'type': 'string'},
            'kb_permalink': {'type': 'string'},
            'kb_published': {'type': 'boolean'},
            'kb_keywords': {'type': 'string'},
            'kb_author_email': {'type': 'string'},
            'kb_password': {'type': 'string'},
            'kb_featured': {'type': 'boolean'},
            'kb_seo_title': {'type': 'string'},
            'kb_seo_description': {'type': 'string'}
        },
        'required': ['api_auth_token', 'kb_title', 'kb_body', 'kb_author_email', 'kb_published']
    };

    // validate against schema
    var validation = v.validate(req.body, articleSchema);
    var validationResult = validation.errors.length !== 1;

    // if have some data
    if(req.body){
        // check auth token is correct
        if(req.body.api_auth_token && req.body.api_auth_token === config.settings.api_auth_token){
            // token is ok and validated, we insert into DB

            // check permalink if it exists
            common.validate_permalink(db, req.body, function(err, result){
                // duplicate permalink
                if(err){
                    res.status(400).json({result: false, errors: [err]});
                    return;
                }

                // check all required data is present and correct
                if(validationResult === true){
                    // find the user by email supplied
                    db.users.findOne({user_email: req.body.kb_author_email}, function (err, user){
                        // if error or user not found
                        if(err || user === null){
                            res.status(400).json({result: false, errors: ['No author found with supplied email']});
                            return;
                        }

                        var featuredArticle = typeof req.body.kb_featured !== 'undefined' ? req.body.kb_featured.toString() : 'false';
                        var publishedArticle = typeof req.body.kb_published !== 'undefined' ? req.body.kb_published.toString() : 'false';

                        // setup the doc to insert
                        var doc = {
                            kb_permalink: req.body.kb_permalink,
                            kb_title: req.body.kb_title,
                            kb_body: req.body.kb_body,
                            kb_published: publishedArticle,
                            kb_keywords: req.body.kb_keywords,
                            kb_published_date: new Date(),
                            kb_last_updated: new Date(),
                            kb_featured: featuredArticle,
                            kb_last_update_user: user.users_name + ' - ' + user.user_email,
                            kb_author: user.users_name,
                            kb_author_email: user.user_email,
                            kb_seo_title: req.body.kb_seo_title,
                            kb_seo_description: req.body.kb_seo_description
                        };

                        // insert article
                        db.kb.insert(doc, function (err, newDoc){
                            if(err){
                                res.status(400).json({result: false, errors: [err]});
                                return;
                            }

                            // setup keywords
                            var keywords = '';
                            if(req.body.kb_keywords !== undefined){
                                keywords = req.body.kb_keywords.toString().replace(/,/g, ' ');
                            }

                            // get the new ID
                            var newId = newDoc._id;
                            if(config.settings.database.type !== 'embedded'){
                                newId = newDoc.insertedIds[0];
                            }

                            // create lunr doc		
                            var lunr_doc = {		
                                kb_title: req.body.kb_title,		
                                kb_keywords: keywords,		
                                id: newId		
                            };		

                            // if index body is switched on		
                            if(config.settings.index_article_body === true){		
                                lunr_doc['kb_body'] = req.body.frm_kb_body;		
                            }		

                            // add to lunr index
                            lunr_index.add(lunr_doc);

                            res.status(200).json({result: true, message: 'All good'});
                        });
                    });
                }else{
                    res.status(400).json({result: false, errors: [validation.errors]});
                    return;
                }
            });
        }else{
            res.status(400).json({result: false, errors: ['Incorrect or invalid auth token']});
            return;
        }
    }else{
        res.status(400).json({result: false, errors: ['No data']});
        return;
    }
});

module.exports = router;
