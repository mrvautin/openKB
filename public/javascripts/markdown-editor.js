window.onload = function() {    
    var convertTextAreaToMarkdown = function(){
        var classy = window.markdownItClassy;
        var mark_it_down = window.markdownit({ html: true,linkify: true,typographer: true, breaks: true});
        mark_it_down.use(classy);
        var text = $('#editor').val();
        var html = mark_it_down.render(text);

        // add responsive images and tables
        var fixed_html = html.replace(/<img/g,"<img class='img-responsive' ");
        fixed_html = fixed_html.replace(/<table/g,"<table class='table table-hover' ");
        $('#preview').html(fixed_html);
    }
    
    // on input change, call the function to convert
    $('#editor').bind('input', function() {
        convertTextAreaToMarkdown();
    });
    
    convertTextAreaToMarkdown();
};