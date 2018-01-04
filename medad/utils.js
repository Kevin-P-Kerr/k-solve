var compileUtils = require("./compile.js");
var MULT = compileUtils.MULT;
var PRED = compileUtils.PRED;
var NEGATE = compileUtils.NEGATE;
var printSolution = function (satSol,varTable,theorem) {
    if (!satSol.sat) { return "cannot solve sat instance";} 
    var str = '';
    var concludingClauses = [];
    if (theorem.type != MULT) {
      throw new Error();
    }
    theorem.body.forEach(function (p) {
      if (p.type == PRED) {
        concludingClauses.push(p.name);
      }
      else if (p.type == NEGATE) {
        concludingClauses.push(p.body[0].name);
      }
      else {
        throw new Error();
      }
    });
    satSol.trueVars.forEach(function (v) {
      if (concludingClauses.indexOf(v) >= 0) { return; }
      str += varTable[v] +"\n";
    });
    satSol.falseVars.forEach(function (v) {
      if (concludingClauses.indexOf(v) >= 0) { return; }
        str += "~"+varTable[v] +"\n";
    });
    str += "----\n";
    theorem.body.forEach(function (p) {
      if (p.type == PRED) {
        str += varTable[p.name]+"\n";
      }
      else if (p.type == NEGATE) {
        str += "~"+varTable[p.body[0].name]+"\n";
      }
      else { throw new Error();
      }
    });
    return str;
};

var utils = {};
utils.printSolution = printSolution;

module.exports = utils;

