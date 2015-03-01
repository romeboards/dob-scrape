var getECBViolations = require('./ecbviolations');
var getComplaints = require('./complaints');
var Q = require('q');


var bin = (process.argv[2]) ? process.argv[2] : '3031404'; //sample

Q.all([
  getECBViolations(bin),
  getComplaints(bin)
]).then(function (vals) {
  console.log(JSON.stringify(vals));
}).catch(function(error) {
  console.error(error);
});
