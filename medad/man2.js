var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");

var println = logicUtils.println;
var axioms = [];
axioms.push("forall a: ~MAN(a) + MORTAL(a)");
axioms.push("forall a: ~SOC(a) + MAN(a)");
var compAx = [];
axioms.forEach(function (ax) {
    var ln = logicUtils.compileLine(ax);
    console.log(println(ln));
    compAx.push(ln);
});

