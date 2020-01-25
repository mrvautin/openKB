const uglifycss = require('uglifycss');
const uglifyjs = require('uglify-js');
const path = require('path');
const fs = require('fs');

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
        const cssfileContents = fs.readFileSync(filename, 'utf8');
        const cssUglified = uglifycss.processString(cssfileContents);
        const cssMiniFilename = filename.substring(0, filename.length - 4) + '.min.' + type;
        fs.writeFileSync(cssMiniFilename, cssUglified, 'utf8');
    }
    if(type === 'js'){
        const rawCode = fs.readFileSync(filename, 'utf8');
        const jsUglified = uglifyjs.minify(rawCode, {
            compress: {
                dead_code: true,
                global_defs: {
                    DEBUG: false
                }
            }
        });

        const jsMiniFilename = filename.substring(0, filename.length - 3) + '.min.' + type;
        fs.writeFileSync(jsMiniFilename, jsUglified.code, 'utf8');
    }
}
