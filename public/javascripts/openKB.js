$(document).ready(function() {	
	// add the responsive image class to all images
	$('img').each(function(){
		$(this).addClass("img-responsive")
	});
	
	//setup mermaid charting
	mermaid.initialize({startOnLoad:true});
	
	// add the table class to all tables
	$('table').each(function(){
		$(this).addClass("table table-hover")
	});
	
	// add the token field to the keywords input
	$('#frm_kb_keywords').tokenfield();
	
	// setup the inline file attachement
	$('#editor').inlineattachment({
		uploadUrl: '/file/upload_file'
	});
	
	// Call to API for a change to the published state of a KB
	$("input[class='published_state']").change(function() {
		$.ajax({
			method: "POST",
			url: "/published_state",
			data: { id: this.id, state: this.checked }
		})
		.success(function(msg) {
            show_notification(msg,"success");
        })
        .error(function(msg) {
            show_notification(msg.responseText,"danger");
        });
	});
	
	// Call to API to check if a permalink is available
	$("#validate_permalink").click(function() {
		if($("#frm_kb_permalink").val() != ""){
			$.ajax({
				method: "POST",
				url: "/api/validate_permalink",
				data: {"permalink" : $("#frm_kb_permalink").val(), "doc_id": $("#frm_kb_id").val()}
			})
			.success(function(msg) {
				show_notification(msg,"success");
			})
			.error(function(msg) {
				show_notification(msg.responseText,"danger");
			});
		}else{
			show_notification("Please enter a permalink to validate","danger");
		}
	});
	
	// generates a random permalink
	$("#generate_permalink").click(function() {
		var min = 100000;
		var max = 999999;
		var num = Math.floor(Math.random() * (max - min + 1)) + min;
		 $("#frm_kb_permalink").val(num);
	});
	
	// applies an article filter
	$("#btn_articles_filter").click(function() {
		window.location.href = "/articles/" + $("#article_filter").val();
	});
	
	// resets the article filter
	$("#btn_articles_reset").click(function() {
		window.location.href = "/articles";
	});
	
	// search button click event
	$("#btn_search").click(function(event) {
		if($("#frm_search").val() == ""){
			show_notification("Please enter a search value", "danger");
			event.preventDefault();
		}
	});
	
	if($("#input_notify_message").val() != ""){
		// save values from inputs
		var message_val = $("#input_notify_message").val();
		var message_type_val = $("#input_notify_message_type").val();
		
		// clear inputs
		$("#input_notify_message").val("");
		$("#input_notify_message_type").val("");
		
		// alert
		show_notification(message_val, message_type_val, false)
	}	
});

// Calls the API to delete a file
function file_delete_confirm(img, id) {
	if (window.confirm("Are you sure you want to delete the file?")) {
		$.ajax({
			method: "POST",
			url: "/file/delete",
			data: { img: img}
		})
		.success(function(msg) {
			$("#file-" + id).remove();
			show_notification(msg, "success");
		})
		.error(function(msg) {
			show_notification(msg, "danger");
		});
	}
}

$(function () { $("input,select,textarea").not("[type=submit]").jqBootstrapValidation(); } );

// show notification popup
function show_notification(msg, type, reload_page){
    // defaults to false
    reload_page = reload_page || false;
   
    $("#notify_message").removeClass();
    $("#notify_message").addClass('notify_message-' + type);
    $("#notify_message").html(msg);
    $('#notify_message').slideDown(600).delay(1200).slideUp(600, function() {
        if(reload_page == true){
            location.reload();
        }
    });
}

function search_form(id) {
	$('form#'+ id).submit();
}