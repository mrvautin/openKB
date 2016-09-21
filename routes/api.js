var express = require('express');
var router = express.Router();
var common = require('./common');

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

module.exports = router;
