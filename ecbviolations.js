/*
  
  [TODO] This currently one scrapes the most recent 20 complaints

*/  


var request = require('request');
var htmlparser = require('htmlparser2');
var Q = require('q');

// use a negative index to insert relative to the end of the string.
String.prototype.insert = function (index, string) {
  var ind = index < 0 ? this.length + index  :  index;
  return  this.substring(0, ind) + string + this.substring(ind, this.length);
};

module.exports = function(bin) {

  var ecbQuerybyAddressUrl = 'http://a810-bisweb.nyc.gov/bisweb/ECBQueryByLocationServlet';
  var overviewForECBviolationUrl = 'http://a810-bisweb.nyc.gov/bisweb/ECBQueryByNumberServlet?ecbin=';
  var params = {
      allbin : bin
  };

  var comments = [], info = [];
  var prop = {
    numOfTotalViolations : 0,
    numOfOpenViolations : 0,
    totalPenaltiesPaid : 0,
    totalPenaltiesBalance : 0,    
    totalPenaltiesImposed : 0,    
    totalPenaltiesAdj : 0,    
    totalPenaltiesPending : 0,    
    totalPenaltiesNotPending : 0,    
    items : []
  };

  var parseComments = function() {

    var hasRecords = false;

    // go thru comment block and find the one with data
    comments.forEach(function (comment) {
      if ( /GlRecCountN\s::\s(.*)/.test(comment)){
        info = comment.split('\n');
        hasRecords = true;
      }    
    });
    if(hasRecords) return parseData();
    else return { ecbviolations : prop };       // default Obj
  };

  var parseData = function() {
    var startIdx, issuesOnPage; // number of complaints if the number is <20, else 20

    // for each line in the data block
    for(var i = 0; i < info.length; i++) {
      if ( /GlRecCountN\s::\s(.*)/.test(info[i])){
        prop.numOfTotalViolations = /GlRecCountN\s::\s(.*)/.exec(info[i])[1].replace(/^0+/, ''); 
        issuesOnPage = (parseInt(prop.numOfTotalViolations) > 20) ? 20 : parseInt(prop.numOfTotalViolations);            
        startIdx = i + 14;
      }    
      else if ( /TotViolsOpen\s::\s(.*)/.test(info[i])){
        prop.numOfOpenViolations = /TotViolsOpen\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotPenaltiesPaid\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesPaid = /TotPenaltiesPaid\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotPenaltiesBalance\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesBalance = /TotPenaltiesBalance\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotPenaltiesImposed\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesImposed = /TotPenaltiesImposed\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotPenaltiesAdj\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesAdj = /TotPenaltiesAdj\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotPending\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesPending = /TotPending\s::\s(.*)/.exec(info[i])[1]; 
      }  
      else if ( /TotNotPending\s::\s(.*)/.test(info[i])){
        prop.totalPenaltiesNotPending = /TotNotPending\s::\s(.*)/.exec(info[i])[1]; 
      }      
    }

    /*
      active flag: 'A' is open, 'D' is resolved
      [TODO] infraction codes - listed in concatenated versions = 103,203 --> 103203
    */    

    for(var i = 0, j = startIdx; i < issuesOnPage; i++, j+=14) {

      // all data exists within {}'s
      var item = {
        ecbViolationNumber : /\{(.*)\}/.exec(info[j+1])[1],
        linkToPage : overviewForECBviolationUrl + (/\{(.*)\}/.exec(info[j+1])[1]),
        activeFlag : /\{(.*)\}/.exec(info[j+2])[1],
        respondent : /\{(.*)\}/.exec(info[j+3])[1],
        bobViolationNumber : /\{(.*)\}/.exec(info[j+4])[1],
        licenseNumber : /\{(.*)\}/.exec(info[j+5])[1],
        dobViolationStatus : /\{(.*)\}/.exec(info[j+6])[1],
        ecbHearingStatus : /\{(.*)\}/.exec(info[j+7])[1],
        inspectionUnit : /\{(.*)\}/.exec(info[j+8])[1],
        violationType : /\{(.*)\}/.exec(info[j+9])[1],
        balanceDue : /\{(.*)\}/.exec(info[j+10])[1].insert(-2, '.'), //add . to indicate cents
        violationIssueDate : /\{(.*)\}/.exec(info[j+11])[1],
        severityClass : /\{(.*)\}/.exec(info[j+12])[1],
        infractionCodes : /\{(.*)\}/.exec(info[j+13])[1],

      };
      
      if(item.activeFlag === 'A') item.activeFlagString = "OPEN";
      else if(item.activeFlag === 'D') item.activeFlagString = "RESOLVED";
      else item.activeFlagString = "ERROR - STATUS UNKNOWN";

      prop.items.push(item);

    }

    return { ecbviolations : prop };
  }

  var getECBViolations = Q.defer();

  var parser = new htmlparser.Parser({
      oncomment: function(text){ comments.push(text); },
      onend: function() { getECBViolations.resolve(parseComments()); }
  }, {decodeEntities: true});

  request({url:ecbQuerybyAddressUrl, qs:params}, function (error, response, body) {
    if (error) getECBViolations.reject(error); 
    if (!error && response.statusCode == 200) {
      parser.write(body);
      parser.end();
    }
  });

  return getECBViolations.promise;
};


