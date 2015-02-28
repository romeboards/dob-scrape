/*
  
  [TODO] This currently one scrapes the most recent 20 complaints

*/  


var request = require('request');
var htmlparser = require('htmlparser2');

var complaintsByAddressUrl = 'http://a810-bisweb.nyc.gov/bisweb/ComplaintsByAddressServlet';
var overviewForComplaintUrl = 'http://a810-bisweb.nyc.gov/bisweb/OverviewForComplaintServlet';
var bin = (process.argv[2]) ? process.argv[2] : '3031404'; //sample
var params = {
    allbin : bin
};

var comments = [], info = [];
var prop = {
  items : []
};

var parser = new htmlparser.Parser({
    oncomment: function(text){ comments.push(text); },
    onend: function() { parseComments(); }
}, {decodeEntities: true});

var parseComments = function() {

  // go thru comment block and find the one with data
  comments.forEach(function (comment) {
    if ( /GlRecCountN\s::\s(.*)/.test(comment)){
      info = comment.split('\n');
    }    
  });

  var startIdx, endIdx;
  var complaintsOnPage; // number of complaints if the number is <20, else 20

  // for each line in the data block
  info.forEach(function (line, idx) {
    if ( /GlRecCountN\s::\s(.*)/.test(line)){
      prop.numOfComplaints = /GlRecCountN\s::\s(.*)/.exec(line)[1].replace(/^0+/, ''); 
      complaintsOnPage = (parseInt(prop.numOfComplaints) >= 20) ? 20 : parseInt(prop.numOfComplaints);            
      startIdx = idx  + 3;
      endIdx = startIdx + (complaintsOnPage * 14); //14 lines per data entry
    }    
  });


  for(var i = 0, j = startIdx; i < complaintsOnPage; i++, j+=14) {

    // all data exists within {}'s
    var item = {
      complaintNumber : /\{(.*)\}/.exec(info[j+1])[1],
      complaintAddress : /\{(.*)\}/.exec(info[j+2])[1],
      dateEntered : /\{(.*)\}/.exec(info[j+3])[1],
      category : /\{(.*)\}/.exec(info[j+4])[1],
      inspectionDate : /\{(.*)\}/.exec(info[j+5])[1],
      disposition : /\{(.*)\}/.exec(info[j+6])[1],
      status : /\{(.*)\}/.exec(info[j+7])[1],
      vlcompdetlkey : /\{(.*)\}/.exec(info[j+8])[1],
      linkToPage : overviewForComplaintUrl + '?vlcompdetlkey=' + (/\{(.*)\}/.exec(info[j+8])[1]),
      fineAmount : /\{(.*)\}/.exec(info[j+9])[1],
      fineFlage : /\{(.*)\}/.exec(info[j+10])[1],
      description : /\{(.*)\}/.exec(info[j+11])[1] + /\{(.*)\}/.exec(info[j+12])[1] + /\{(.*)\}/.exec(info[j+13])[1]
    };
    
    prop.items.push(item);

  }

  //return JSON.stringify(prop);
  console.log(JSON.stringify(prop));
};

//var getComplaints = function () {
  request({url:complaintsByAddressUrl, qs:params}, function (error, response, body) {
    if (error) console.log(error);
    if (!error && response.statusCode == 200) {
      parser.write(body);
      parser.end();
    }
  });
//}

