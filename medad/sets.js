var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
var map = {};
map.A = 'CONTAINS';
map.B = 'CONTAINS';
map.C = 'CONTAINS';
map.D = 'IN';
map.E = 'IN';
map.F = 'INTERSECTS';
map.G = 'UNIONS';
axioms.push('(A) B (C)\nA B\tA C\tC B');
axioms.push('(D) E (C)\nD E\tE C\tD C');
axioms.push('(F) (D) E (G)\nD E\tE G\tF D\tF G\tF G');
var pack = logicUtils.compileAxioms(axioms,map);
var lns = pack[1];
var graph = pack[0];
var conv = logicUtils.convolute(lns,2);
conv.forEach(function (ln) {
  console.log('******');
  console.log(println(ln));
});

