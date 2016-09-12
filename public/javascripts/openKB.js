$(document).ready(function(){
	// add the responsive image class to all images
    $('img').each(function(){
        $(this).addClass('img-responsive');
    });

    // make all links in articles open in new window/tab
    if($('#blank_links').val() === 'true'){
        $('.body_text a').attr('target', '_blank');
    }

	// setup mermaid charting
    if(typeof mermaid !== 'undefined'){
        mermaid.initialize({startOnLoad: true});
    }

	// add the table class to all tables
    $('table').each(function(){
        $(this).addClass('table table-hover');
    });

    // setup the push menu
    if(typeof jPushMenu !== 'undefined'){
        $('.toggle-menu').jPushMenu();
    }

    // highlight any code blocks
    $('pre code').each(function(i, block){
        hljs.highlightBlock(block);
    });

	// add the token field to the keywords input
    if(typeof tokenfield !== 'undefined'){
	    $('#frm_kb_keywords').tokenfield();
    }

    if($('#editor').length){
        // setup editors
        var simplemde = new SimpleMDE({
            element: $('#editor')[0],
            toolbar: ['bold', 'italic', 'heading', '|', 'quote', 'unordered-list', 'ordered-list', '|', 'link', 'image', '|', 'table', 'horizontal-rule', 'code', 'guide']
        });

        // setup inline attachments
        inlineAttachment.editors.codemirror4.attach(simplemde.codemirror, {uploadUrl: '/file/upload_file'});

        // do initial convert on load
        convertTextAreaToMarkdown();

        // attach to editor changes and update preview
        simplemde.codemirror.on('change', function(){
            convertTextAreaToMarkdown();
        });

        // auto scrolls the simpleMDE preview pane
        var preview = document.getElementById('preview');
        if(preview !== null){
            // Syncs scroll  editor -> preview
            var cScroll = false;
            var pScroll = false;
            simplemde.codemirror.on('scroll', function(v){
                if(cScroll){
                    cScroll = false;
                    return;
                }
                pScroll = true;
                var height = v.getScrollInfo().height - v.getScrollInfo().clientHeight;
                var ratio = parseFloat(v.getScrollInfo().top) / height;
                var move = (preview.scrollHeight - preview.clientHeight) * ratio;
                preview.scrollTop = move;
            });

            // Syncs scroll  preview -> editor
            preview.onscroll = function(){
                if(pScroll){
                    pScroll = false;
                    return;
                }
                cScroll = true;
                var height = preview.scrollHeight - preview.clientHeight;
                var ratio = parseFloat(preview.scrollTop) / height;
                var move = (simplemde.codemirror.getScrollInfo().height - simplemde.codemirror.getScrollInfo().clientHeight) * ratio;
                simplemde.codemirror.scrollTo(0, move);
            };
        }
    }

    // if in the editor, trap ctrl+s and cmd+s shortcuts and save the article
    if($('#frm_editor').val() === 'true'){
        $(window).bind('keydown', function(event){
            if(event.ctrlKey || event.metaKey){
                if(String.fromCharCode(event.which).toLowerCase() === 's'){
                    event.preventDefault();
                    $('#frm_edit_kb_save').click();
                }
            }
        });
    }

	// Call to API for a change to the published state of a KB
	$("input[class='published_state']").change(function(){
		$.ajax({
			method: 'POST',
			url: $('#app_context').val() + '/published_state',
			data: {id: this.id, state: this.checked}
		})
		.done(function(msg){
            show_notification(msg, 'success');
        })
        .fail(function(msg){
            show_notification(msg.responseText, 'danger');
        });
	});

    // convert editor markdown to HTML and display in #preview div
    function convertTextAreaToMarkdown(){
        var classy = window.markdownItClassy;

        var mark_it_down = window.markdownit({html: true, linkify: true, typographer: true, breaks: true});
        mark_it_down.use(classy);
        var html = mark_it_down.render(simplemde.value());

        // add responsive images and tables
        var fixed_html = html.replace(/<img/g, "<img class='img-responsive' ");
        fixed_html = fixed_html.replace(/<table/g, "<table class='table table-hover' ");
        $('#preview').html(fixed_html);

        // re-hightlight the preview
        $('pre code').each(function(i, block){
            hljs.highlightBlock(block);
        });
    }

    // user up vote clicked
    $(document).on('click', '#btnUpvote', function(){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/vote',
            data: {'doc_id': $('#doc_id').val(), 'vote_type': 'upvote'}
        })
        .done(function(msg){
            show_notification(msg, 'success', true);
            console.log('success', msg.responseText);
        })
        .fail(function(msg){
            console.log('fail', msg);
            show_notification(msg.responseText, 'danger');
        });
    });

    // user down vote clicked
    $(document).on('click', '#btnDownvote', function(){
        $.ajax({
            method: 'POST',
            url: $('#app_context').val() + '/vote',
            data: {'doc_id': $('#doc_id').val(), 'vote_type': 'downvote'}
        })
        .done(function(msg){
            show_notification(msg, 'success', true);
            console.log('success', msg.responseText, true);
        })
        .fail(function(msg){
            console.log('fail', msg);
            show_notification(msg.responseText, 'danger');
        });
    });

	// Call to API to check if a permalink is available
	$('#validate_permalink').click(function(){
		if($('#frm_kb_permalink').val() !== ''){
			$.ajax({
				method: 'POST',
				url: $('#app_context').val() + '/api/validate_permalink',
				data: {'permalink': $('#frm_kb_permalink').val(), 'doc_id': $('#frm_kb_id').val()}
			})
			.done(function(msg){
				show_notification(msg, 'success', true);
			})
			.fail(function(msg){
				show_notification(msg.responseText, 'danger');
			});
		}else{
			show_notification('Please enter a permalink to validate', 'danger');
		}
	});

	// generates a random permalink
	$('#generate_permalink').click(function(){
		var min = 100000;
		var max = 999999;
		var num = Math.floor(Math.random() * (max - min + 1)) + min;
		$('#frm_kb_permalink').val(num);
	});

	// applies an article filter
	$('#btn_articles_filter').click(function(){
		window.location.href = $('#app_context').val() + '/articles/' + $('#article_filter').val();
	});

	// resets the article filter
	$('#btn_articles_reset').click(function(){
		window.location.href = $('#app_context').val() + '/articles';
	});

	// search button click event
	$('#btn_search').click(function(event){
		if($('#frm_search').val() === ''){
			show_notification('Please enter a search value', 'danger');
			event.preventDefault();
		}
	});

	if($('#input_notify_message').val() !== ''){
		// save values from inputs
		var message_val = $('#input_notify_message').val();
		var message_type_val = $('#input_notify_message_type').val();

		// clear inputs
		$('#input_notify_message').val('');
		$('#input_notify_message_type').val('');

		// alert
		show_notification(message_val, message_type_val, false);
	}
});

// Calls the API to delete a file
function file_delete_confirm(img, id){
	if(window.confirm('Are you sure you want to delete the file?')){
		$.ajax({
			method: 'POST',
			url: $('#app_context').val() + '/file/delete',
			data: {img: img}
		})
		.done(function(msg){
			$('#file-' + id).remove();
			show_notification(msg, 'success');
		})
		.fail(function(msg){
			show_notification(msg, 'danger');
		});
	}
}

// show notification popup
function show_notification(msg, type, reload_page){
    // defaults to false
    reload_page = reload_page || false;

    console.log(reload_page);

    $('#notify_message').removeClass();
    $('#notify_message').addClass('notify_message-' + type);
    $('#notify_message').html(msg);
    $('#notify_message').slideDown(600).delay(1200).slideUp(600, function(){
        if(reload_page === true){
            location.reload();
        }
    });
}

function search_form(id){
	$('form#' + id).submit();
}
