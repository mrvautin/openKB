$(document).ready(function() {
	$("#input_tags").bootstrapTagger({backgroundColor: "random"});
	
	$('.prettyprint').html(function() {
		return this.innerHTML.replace(/\t/g, '');
	});
});