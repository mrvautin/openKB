$(document).ready(function() {
	$("#input_tags").bootstrapTagger({backgroundColor: "random"});
	$("#input_tags_default").bootstrapTagger({backgroundColor: "default"});
	$("#input_tags_primary").bootstrapTagger({backgroundColor: "primary"});
	$("#input_tags_success").bootstrapTagger({backgroundColor: "success"});
	$("#input_tags_info").bootstrapTagger({backgroundColor: "info"});
	$("#input_tags_warning").bootstrapTagger({backgroundColor: "warning"});
	$("#input_tags_danger").bootstrapTagger({backgroundColor: "danger"});
	$("#input_tags_random").bootstrapTagger({backgroundColor: "random"});
	
	$('.prettyprint').html(function() {
		return this.innerHTML.replace(/\t/g, '');
	});
});