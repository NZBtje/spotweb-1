function spotPosting() {
	this.commentForm = null;
	this.reportForm = null;
	this.uiStart = null;
	this.uiDone = null;

	this.cbHashcashCalculated = function (self, hash) {
	    self.commentForm['postcommentform[newmessageid]'].value = hash;
	    self.commentForm['postcommentform[submit]'].value = 'Post';
		self.uiDone();

		// convert the processed form to post values
		var dataString = $(self.commentForm).serialize()
		
		// and actually process the call
		$.ajax({  
			type: "POST",  
			url: "?page=postcomment",  
			dataType: "xml",
			data: dataString,  
			success: function(xml) {
				var result = $(xml).find('result').text();
				if(result == 'success') {
					var user = $(xml).find('user').text();
					var userid = $(xml).find('userid').text();
					var rating = $(xml).find('rating').text();
					var text = $(xml).find('body').text();
					var useridurl = 'http://'+window.location.hostname+window.location.pathname+'?search[tree]=&amp;search[type]=UserID&amp;search[text]='+userid;

					var data = "<li> <strong> Gepost door <span class='user'>"+user+"</span> (<a class='userid' target='_parent' href='"+useridurl+"' title='Zoek naar spots van "+user+"'>"+userid+"</a>) @ just now </strong> <br>"+text+"</li>";

					$("li.nocomments").remove();
					$("li.firstComment").removeClass("firstComment");
					$("li.addComment").after(data).next().hide().addClass("firstComment").fadeIn(function(){
						$("#commentslist > li").removeClass("even");
						$("#commentslist > li:nth-child(even)").addClass('even');
						$("span.commentcount").html('# '+$("#commentslist").children().not(".addComment").size());
					});
				}
			},
			error: function(xml) {
				console.log('error: '+((new XMLSerializer()).serializeToString(xml)));
			}
		});
	} // cbHashcashCalculated
		
	this.rpHashcashCalculated = function (self, hash) {
			self.reportForm['postreportform[newmessageid]'].value = hash;
			self.reportForm['postreportform[submit]'].value = 'Post';
			self.uiDone();
			
			var dataString2 = $(self.reportForm).serialize()
			
			$.ajax({  
				type: "POST",  
				url: "?page=reportpost",  
				dataType: "xml",
				data: dataString2,  
				success: function(xml) {
					var result = $(xml).find('result').text();
					var errors = $(xml).find('errors').text();
					
					if(result != 'success') {
						console.log('error: '+((new XMLSerializer()).serializeToString(xml)));
						
						$(".spamreport-button").attr('title', result + ': ' + errors);
						alert('Markeren als spam is niet gelukt: ' + errors);
					} // else					
				},
				error: function(xml) {
					console.log('error: '+((new XMLSerializer()).serializeToString(xml)));
				}
			});
	} // callback rpHashcashCalculated

	this.spotHashcashCalculated = function (self, hash) {
			// Append Dynatree selected 'checkboxes':
			var selectedNodes = $("div#newspotcatselecttree").dynatree("getTree").getSelectedNodes();
			var subcatList = $.map(selectedNodes, function(node){
				if (node.countChildren() == 0) {
					return node.data.key;
				} // if
			}); // map
			
			// and enter the form's inputfields
			self.newSpotForm['newspotform[newmessageid]'].value = hash;
			self.newSpotForm['newspotform[subcatlist]'].value = subcatList.join(',');
			self.newSpotForm['newspotform[submit]'].value = 'Post';
			self.uiDone();

			$(self.newSpotForm).ajaxSubmit({
				type: "POST",  
				url: "?page=postspot",  
				dataType: "xml",
				success: function(xml) {
					var $dialdiv = $("#editdialogdiv")
					var result = $(xml).find('result').text();
					
					if (result == 'success') {
						$dialdiv.empty();
						$dialdiv.dialog('close');
					} else {						
						// voeg nu de errors in de html
						var $formerrors = $dialdiv.find("ul.formerrors");
						$formerrors.empty();

						// zet de errors van het formulier in de errorlijst
						$('errors', xml).each(function() {
							$formerrors.append("<li>" + $(this).text() + "</li>");
						}); // each
					} // if post was not succesful
				}, // success()
				error: function(xml) {
					console.log('error: '+((new XMLSerializer()).serializeToString(xml)));
				}
			});
	} // callback spotHashcashCalculated
	
	this.postComment = function(commentForm, uiStart, uiDone) {
		this.commentForm = commentForm;
		this.uiStart = uiStart;
		this.uiDone = uiDone;
		
		// update the UI 
		this.uiStart();

		// First retrieve some values from the form we are submitting
		var randomstr = commentForm['postcommentform[randomstr]'].value;
		var rating = commentForm['postcommentform[rating]'].value;

		// inreplyto is the whole messageid, we strip off the @ part to add
		// our own stuff
		var inreplyto = commentForm['postcommentform[inreplyto]'].value;
		inreplyto = inreplyto.substring(0, inreplyto.indexOf('@'));

		/* Nu vragen we om, asynchroon, een hashcash te berekenen. Zie comments van calculateCommentHashCash()
		   waarom dit asynhcroon verloopt */
		this.calculateCommentHashCash('<' + inreplyto + '.' + rating + '.' + randomstr + '.', '@spot.net>', 0, this.cbHashcashCalculated);
	} // postComment
	
	this.postReport = function(reportForm, uiStart, uiDone) {
		this.reportForm = reportForm;
		this.uiStart = uiStart;
		this.uiDone = uiDone;
		
		this.uiStart();
		
		var randomstr = reportForm['postreportform[randomstr]'].value;
		
		var inreplyto = reportForm['postreportform[inreplyto]'].value;
		inreplyto = inreplyto.substring(0, inreplyto.indexOf('@'));
		
		this.calculateCommentHashCash('<' + inreplyto + '.' + randomstr + '.', '@spot.net>', 0, this.rpHashcashCalculated);
	} // postReport

	this.postNewSpot = function(newSpotForm, uiStart, uiDone) {
		this.newSpotForm = newSpotForm;
		this.uiStart = uiStart;
		this.uiDone = uiDone;
		
		this.uiStart();
		
		this.calculateCommentHashCash('<', '@spot.net>', 0, this.spotHashcashCalculated);
	} // postNewSpot
	
	//
	// We breken de make expensive hash op in stukken omdat 
	// anders IE8 gaat zeuren over scripts die te lang lopen.
	//
	this.calculateCommentHashCash = function(prefix, suffix, runCount, cbWhenFound) {
		var possibleChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';
		var hash = prefix + suffix;
		var validHash = false;

		do {
			runCount++;
			uniquePart = '';
			
			for(i = 0; i < 15; i++) {
				var irand = Math.round(Math.random() * (possibleChars.length - 1));
				uniquePart += possibleChars.charAt(irand);
			} // for

			hash = $.sha1(prefix + uniquePart + suffix);
			validHash = (hash.substr(0, 4) == '0000');
		} while ((!validHash) && ((runCount % 500) != 0));

		if (validHash) {
			cbWhenFound(this, prefix + uniquePart + suffix);
		} else {
			if (runCount > 400000) {
				alert("Unable to calculate SHA1 hash: " + runCount);
				cbWhenFound(this, '');
			} else {
				var _this = this;
				window.setTimeout(function() { _this.calculateCommentHashCash(prefix, suffix, runCount, cbWhenFound); }, 0);
			} // else
		} // if

	} // calculateCommentHashCash
};
