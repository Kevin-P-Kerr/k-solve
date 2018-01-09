var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
axioms.push("forall a: ~MAN(a) + MORTAL(a)");
axioms.push("forall b: ~SOC(b) + MAN(b)");
var compAx = [];
axioms.forEach(function (ax) {
    var ln = logicUtils.compileLine(ax);
    var nm = [];
    ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); });
    ln.matrix = nm;
    console.log(println(ln));
    compAx.push(ln);
});
var map = {};
var i = 0;
var ii =4;
for(;i<ii;i++) {
    var satP = logicUtils.compile2sat(compAx,map,i);
    var a = sat.solve(satP.problem);
    console.log(utils.printSolution(a,satP.varTable,satP.trueProp));
}
var conv = logicUtils.convolute(compAx,2);
map = {};
map['.b'] = '.a';
map['.c'] = '.a';
map['.d'] = '.a';
console.log(println(logicUtils.product(conv)));
for (i=0,ii=16;i<ii;i++) {
    satP = logicUtils.compile2sat(conv,map,i);
    a = sat.solve(satP.problem);
    console.log(utils.printSolution(a,satP.varTable,satP.trueProp));
}
