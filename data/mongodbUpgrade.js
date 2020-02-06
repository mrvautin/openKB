// This code is largely borrowed from: github.com/louischatriot/nedb-to-mongodb

// This code moves your data from NeDB to MongoDB
// You will first need to create the MongoDB connection in your /routes/config.json file
// You then need to ensure your MongoDB Database has been created.

// ** IMPORTANT **
// There are no duplication checks in place. Please only run this script once.
// ** IMPORTANT **

const Nedb = require('nedb');
const mongodb = require('mongodb');
const async = require('async');
const path = require('path');
const common = require('../routes/common');
const config = common.read_config();
let ndb;

// check for DB config
if(!config.settings.database.connection_string){
    console.log('No MongoDB configured. Please see README.md for help');
    process.exit(1);
}

// Connect to the MongoDB database
mongodb.connect(config.settings.database.connection_string, {}, (err, mdb) => {
    if(err){
        console.log('Couldn\'t connect to the Mongo database');
        console.log(err);
        process.exit(1);
    }

    console.log('Connected to: ' + config.settings.database.connection_string);
    console.log('');

    insertKB(mdb, (KBerr, report) => {
        insertUsers(mdb, (Usererr, report) => {
            if(KBerr || Usererr){
                console.log('There was an error upgrading to MongoDB. Check the console output');
            }else{
                console.log('MongoDB upgrade completed successfully');
                process.exit();
            }
        });
    });
});

function insertKB(db, callback){
    const collection = db.collection('kb');
    console.log(path.join(__dirname, 'kb.db'));
    ndb = new Nedb(path.join(__dirname, 'kb.db'));
    ndb.loadDatabase((err) => {
        if(err){
            console.error('Error while loading the data from the NeDB database');
            console.error(err);
            process.exit(1);
        }

        ndb.find({}, (err, docs) => {
            if(docs.length === 0){
                console.error('The NeDB database contains no data, no work required');
                console.error('You should probably check the NeDB datafile path though!');
            }else{
                console.log('Loaded ' + docs.length + ' article(s) data from the NeDB database');
                console.log('');
            }

            console.log('Inserting articles into MongoDB...');
            async.each(docs, (doc, cb) => {
                console.log('Article inserted: ' + doc.kb_title);

                // check for permalink. If it is not set we set the old NeDB _id to the permalink to stop links from breaking.
                if(!doc.kb_permalink || doc.kb_permalink === ''){
                    doc.kb_permalink = doc._id;
                }

                // delete the old ID and let MongoDB generate new ones
                delete doc._id;

                collection.insert(doc, (err) => { return cb(err); });
            }, (err) => {
                if(err){
                    console.log('An error happened while inserting data');
                    callback(err, null);
                }else{
                    console.log('All articles successfully inserted');
                    console.log('');
                    callback(null, 'All articles successfully inserted');
                }
            });
        });
    });
};

function insertUsers(db, callback){
    const collection = db.collection('users');
    ndb = new Nedb(path.join(__dirname, 'users.db'));
    ndb.loadDatabase((err) => {
        if(err){
            console.error('Error while loading the data from the NeDB database');
            console.error(err);
            process.exit(1);
        }

        ndb.find({}, (err, docs) => {
            if(docs.length === 0){
                console.error('The NeDB database contains no data, no work required');
                console.error('You should probably check the NeDB datafile path though!');
            }else{
                console.log('Loaded ' + docs.length + ' user(s) data from the NeDB database');
                console.log('');
            }

            console.log('Inserting users into MongoDB...');
            async.each(docs, (doc, cb) => {
                console.log('User inserted: ' + doc.user_email);

                // delete the old ID and let MongoDB generate new ones
                delete doc._id;

                collection.insert(doc, (err) => { return cb(err); });
            }, (err) => {
                if(err){
                    console.error('An error happened while inserting user data');
                    callback(err, null);
                }else{
                    console.log('All users successfully inserted');
                    console.log('');
                    callback(null, 'All users successfully inserted');
                }
            });
        });
    });
};
