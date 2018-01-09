var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
axioms.push("forall a: ~MAN(a) + MORTAL(a)");
axioms.push("forall b: ~SOC(b) + MAN(b)");
axioms.push("forall c thereis d: ~MAN(c) + MAN(d)*MOTHER(d c)");
var compAx = [];
axioms.forEach(function (ax) {
    var ln = logicUtils.compileLine(ax);
    var nm = [];
    ln.matrix.forEach(function (p) { var x = logicUtils.simplifyProp(p); nm.push(x); });
    ln.matrix = nm;
    compAx.push(ln);
});
var map = {};
var i = 0;
var ii =4;
var conv = logicUtils.convolute(compAx,1);
map = {};
map['.b'] = '.a';
map['.c'] = '.a';
map['.e'] = '.d';
map['.f'] = '.a';
map['.g'] = '.a';
map['.h'] = '.d';
console.log(println(logicUtils.product(conv)));
for (i=0,ii=64;i<ii;i++) {
    satP = logicUtils.compile2sat(conv,map,i);
    a = sat.solve(satP.problem);
    console.log(utils.printSolution(a,satP.varTable,satP.trueProp));
}
