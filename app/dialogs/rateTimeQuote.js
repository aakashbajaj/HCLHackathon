const builder = require('botbuilder');
const http = require('http');
const qs = require('querystring');
const xml2js = require('xml2js');

const cntryCd = require('../../data/countryCode.json');
const codes = cntryCd.map((country) => {
	return country.Code
})

function getRate(options, callback) {
	var url = "http://dct.dhl.com/data/quotation/?" + qs.stringify(options);
	var body = "";
	http.get(url, function(res) {
		res.on('data', data => body += data);
		res.on('end', () => {
			xml2js.parseString(body, (err, result) => {
				if (err) {
					callback(false);
				}
				else {
					callback(result);
				}
			})
		});
		res.on('error', err => callback(false));
	})
}

const wgtCh = ["kg", "lb"];
const lntCh = ["cm", "in"];


module.exports = function(bot) {
	bot.dialog('/rateTimeQuote', [

			function(session, args, next) {
				session.send("DHL Capability Tool");
				builder.Prompts.text(session, "What's the Origin Country Code? (like IN, US, AF)");
			},
			function(session, results) {
				let orgCtry = results.response.toUpperCase()
				if(codes.includes(orgCtry)) {
					session.dialogData.orgCtry = orgCtry
					builder.Prompts.text(session, "What's the Destination Country Code? (like IN, US, AF)")
				}
				else {
					session.send('Sorry! this is not a valid country code')
					session.endDialog()
				}
			},
			function(session, results, next) {
				var dstCtry = results.response .toUpperCase()
				if (codes.includes(dstCtry)) {
					session.dialogData.dstCtry = dstCtry
					builder.Prompts.number(session, "Origin City Pin Code?");
				}
				else {
					session.send('Sorry! this is not a valid country code')
					session.endDialog()
				}
			},
			function(session, results) {
				let orgZip = results.response;
				session.dialogData.orgZip = orgZip;
				builder.Prompts.number(session, "Destination City Pin Code?");
			},
			function(session, results) {
				let dstZip = results.response;
				session.dialogData.dstZip = dstZip;
				builder.Prompts.text(session,"When do you want to ship it? (Enter Date in yyyy-mm-dd format)");
			},
			function(session, results) {
				let shpDate = results.response;
				session.dialogData.shpDate = shpDate;
				builder.Prompts.confirm(session, "Is it a Dutiable Material?");
			},
			function(session, results, next) {
				let dtbl = results.response;
				if(dtbl) {
					session.dialogData.dtbl = "Y";
					builder.Prompts.number(session,"Enter Decalred Value (in USD)");
				}
				else {
					session.dialogData.dtbl = "N";
					next()
				}
			},
			function(session, results) {
				if(session.dialogData.dtbl == "Y") {
					session.dialogData.declVal = results.response;
					session.dialogData.declValCur = "USD";
				}
				session.send("Tell me the dimensions of your parcel");
				session.send("Let's first decide the units");
				builder.Prompts.choice(session, "Unit for weight", wgtCh);
			},
			function(session, results) {
				session.dialogData.wgtUom = results.response.entity;
				builder.Prompts.number(session, "Enter Weight (in " + session.dialogData.wgtUom + ")");
			},
			function(session, results) {
				session.dialogData.wgt0 = results.response;
				builder.Prompts.choice(session, "Unit for lengths", lntCh);	
			},
			function(session, results) {
				session.dialogData.dimUom = results.response.entity;
				session.send("Okay. Got It. Now enter the dimensions in " + session.dialogData.dimUom);
				builder.Prompts.number(session,"Length");
			},
			function(session, results) {
				session.dialogData.l0 = results.response;
				builder.Prompts.number(session,"Width");
			},
			function(session, results) {
				session.dialogData.w0 = results.response;
				builder.Prompts.number(session,"Height");
			},
			function(session, results) {
				session.dialogData.h0 = results.response;
				session.send("That's Great! \n\nNow let me see...");
				session.sendTyping();
				var obj = {
						dtbl:session.dialogData.dtbl,
						declVal:session.dialogData.declVal,
						declValCur:session.dialogData.declValCur,
						wgtUom:session.dialogData.wgtUom,
						dimUom:session.dialogData.dimUom,
						noPce:1,
						wgt0:session.dialogData.wgt0,
						w0:session.dialogData.w0,
						l0:session.dialogData.l0,
						h0:session.dialogData.h0,
						shpDate:session.dialogData.shpDate,
						orgCtry:session.dialogData.orgCtry,
						orgZip:session.dialogData.orgZip,
						dstCtry:session.dialogData.dstCtry,
						dstZip:session.dialogData.dstZip
					}
				 getRate(obj, (x) => {
					if (x) {
						qtcount = x.quotationResponse.count[0];
						session.send("I found " + qtcount + " results for your query");
						if (qtcount == 0) {
							session.send("Oops!\n\nError: " + x.quotationResponse.errorMessage[0]);
						}
						else {
							for(var i=0; i<qtcount; i++) {
								qtdata = x.quotationResponse.quotationList[0].quotation[i];
								var res_str = "";
								var prodname = "\n\n" + qtdata.prodNm[0];
								var est_del = "\n\nEstimated Delivery: " + qtdata.estDeliv[0];
								var lat_bkg = "\n\nLatest Booking: " + qtdata.latBkg[0];
								var lat_pick = "\n\nLatest Pickup: " + qtdata.latPckp[0];
								var est_prc = "\n\nEstimated Total Price: ";
								if (qtdata.displayPrices[0] == "Y") {
									est_prc = est_prc + qtdata.estTotPrice[0];
								}
								else {
									est_prc = est_prc + "NOT AVAILABLE";
								}

								res_str = res_str + prodname + est_del + lat_bkg + lat_pick + est_prc;
								session.send(res_str);
							}
						}
					}
					else {
						session.send("I am not able to retrive the information. \n\nSorry for the inconvenience.")
						session.endDialog();
					}
				})
			session.endDialog();
			}

		])
		.reloadAction(
		    "restart", "Ok. Let's start over.",
		    {
		        matches: /^start over$/i,
		        confirmPrompt: "This will start over. Are you sure?"
		    }
		)
		.cancelAction(
		    "cancel", "How can I help you.", 
		    {
		        matches: /^cancel$/i,
		        confirmPrompt: "This will cancel. Are you sure?"
		    }
		)
};