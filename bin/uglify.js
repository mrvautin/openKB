var uglifycss = require('uglifycss');
var uglifyjs = require('uglify-js');
var path = require('path');
var fs = require('fs');

// css files
uglifyFile('public/stylesheets/style.css', 'css');
uglifyFile('public/stylesheets/github.css', 'css');
uglifyFile('public/stylesheets/jpushmenu.css', 'css');
uglifyFile('public/stylesheets/mermaid.css', 'css');
uglifyFile('public/stylesheets/bootstrap-tokenfield.css', 'css');

// js files
uglifyFile(path.join('public', 'javascripts', 'openKB.js'), 'js');
uglifyFile('node_modules/lunr/lunr.js', 'js');
uglifyFile('public/javascripts/jpushmenu.js', 'js');
uglifyFile('public/javascripts/markdown-it-classy.js', 'js');
uglifyFile('public/javascripts/inline-attachment.js', 'js');
uglifyFile('public/javascripts/bootstrap-validator.js', 'js');
uglifyFile('public/javascripts/codemirror.inline-attachment.js', 'js');

function uglifyFile(filename, type){
    if(type === 'css'){
        var cssfileContents = fs.readFileSync(filename, 'utf8');
        var cssUglified = uglifycss.processString(cssfileContents);
        var cssMiniFilename = filename.substring(0, filename.length - 4) + '.min.' + type;
        fs.writeFileSync(cssMiniFilename, cssUglified, 'utf8');
    }
    if(type === 'js'){
        var rawCode = fs.readFileSync(filename, 'utf8');
        var jsUglified = uglifyjs.minify(rawCode, {
            compress: {
                dead_code: true,
                global_defs: {
                    DEBUG: false
                }
            }
        });

        var jsMiniFilename = filename.substring(0, filename.length - 3) + '.min.' + type;
        fs.writeFileSync(jsMiniFilename, jsUglified.code, 'utf8');
    }
}
