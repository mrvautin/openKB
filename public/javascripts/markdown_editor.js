window.onload = function() {
    var convertTextAreaToMarkdown = function(){
        var converter = new showdown.Converter(),
        text      = document.getElementById('editor').value,
        html      = converter.makeHtml(text);
        
        var test = html.replace(/<img/g,"<img class='img-responsive' ");
        document.getElementById('preview').innerHTML = test;
    }
    
    document.getElementById('editor').addEventListener('input', convertTextAreaToMarkdown);
    
    convertTextAreaToMarkdown();
};