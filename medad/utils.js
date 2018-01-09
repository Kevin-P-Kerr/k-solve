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
        var v = varTable[p.name];
        if (concludingClauses.indexOf(v) >= 0) { return; }
        concludingClauses.push(varTable[p.name]);
      }
      else if (p.type == NEGATE) {
        v = varTable[p.body[0].name];
        if (concludingClauses.indexOf(v) >= 0) { return; }
        concludingClauses.push(varTable[p.body[0].name]);
      }
      else {
        throw new Error();
      }
    });
    var usedProps = [];
    satSol.trueVars.forEach(function (v) {
      v = varTable[v];
      if (concludingClauses.indexOf(v) >= 0) { return; }
      if (usedProps.indexOf(v) >= 0) { return; } 
      usedProps.push(v);
      str += v +"\n";
    });
    satSol.falseVars.forEach(function (v) {
      v = varTable[v];
      if (usedProps.indexOf(v) >= 0) { return; } 
      usedProps.push(v);
      if (concludingClauses.indexOf(v) >= 0) { return; }
        str += "~"+v +"\n";
    });
    str += "----\n";
    var used = {};
    theorem.body.forEach(function (p) {
      if (p.type == PRED) {
        if (used[varTable[p.name]]) { return; }
        str += varTable[p.name]+"\n";
        used[varTable[p.name]] = true;
      }
      else if (p.type == NEGATE) {
        if (used[varTable[p.body[0].name]]) { return; }
        str += "~"+varTable[p.body[0].name]+"\n";
        used[varTable[p.body[0].name]] = true;
      }
      else { throw new Error();
      }
    });
    return str;
};

var utils = {};
utils.printSolution = printSolution;

module.exports = utils;

