#! /usr/local/bin/node

var logicUtils = require("./compile.js");
var utils = require("./utils.js");
var sat = require("../js/sat.js");
/*
    arguments =: {constructors | plan}
    constructors =: {constructor}
    constructor =: "constructor" arglist body
    plan =: {Expr | Stmt}
    Expr =: AssignExpr | MultExpr | SimplifyExpr | ReplaceExpr
    Stmt =: PrintStmt
    PrintStmt =: Print(LogicExpr)
    AssignExpr =: Var = Expr
    MultExpr = LogicExpr * LogicExpr
    SimplifyExpr = Simplify(LogicExpr)
    ReplaceExpr = Replace(VarLit,LogicExpr)
    LogicExpr = LogicLit | VarExpr
*/

var interp = function (str) {
    var variables = {};
    var lines = str.split('\n');
    var i = 0;
    var ii = lines.length;
    var f,ln;
    for (; i<ii;i++) {
      ln = lines[i];
      if (ln.match("constructor")) {
        f = makeFunc(lines,i);
        variables[f.name] = f;
        i = f.endLn;
      }
      else {
        interpLn(variables,ln);
      }
    }
};

var makeFunc = function(lines,i) {
  var start = lines[i];
  var name = parseName(start);
  var args = parseArgs(start);
  i++;
  var currLn = lines[i];
  var lns = [];
  while (currLn.match("\t") || currLn.match(/^\s\s/)) {
    lns.push(currLn);
    i++;
    currLn = lines[i];
  }
  var f = {};
  f.name = name;
  f.args = args;
  f.body = lns;
  f.endLn = i-1;
  f.lines = lns;
  return f;
};

// parse the name of a constructor
var parseName = function(ln) {
  ln = ln.split("constructor")[1];
  ln = ln.split('(')[0].trim();
  return ln;
};

// parse the argument list from the constructor
var parseArgs = function(ln) {
  ln = ln.split("constructor")[1];
  ln = ln.split('(')[1];
  ln = ln.split(')')[0];
  ln = ln.split(',');
  var args = [];
  ln.forEach(function (arg) {
    args.push(arg.trim());
  });
  return args;
};

var applyFunction = function (functionObj,args,vars) {
  var props = {};
  var f = functionObj;
  var v = {};
  f.body.forEach(function (ln) {
    interpLn(v,ln);
  });
  var k,v,p,i;
  var ii = args.length;
  var allProps = [];
  for (k in v) {
    p = v[k];
    for (i=0;i<ii;i++) {
      p = logicUtils.replaceVar(p,args[i],f.args[i]);
    }
    allProps.push(p);
  }
  p = allProps[0];
  for (i=1,ii=allProps.length;i<ii;i++) {
    p = logicUtils.multiply(p,allProps[i]);
  }
  return p;
};

var interpLn = function (vars,ln) {
    if (ln.match("//")) {
        return;
    }
    if (ln.match("print")) {
        interpPrint(vars,ln);
        return;
    }
    if (ln.match('=')) {
        interpAssign(vars,ln);
        return;
    }
    return interpExpr(vars,ln);
};

var interpExpr = function (vars,ln) {
  if (ln.indexOf("call") >0) {
    var cp = ln.split("call")[1];
    var name = cp.split('(')[0].trim();
    var args = cp.split('(')[1].split(')')[0].split(',');
    var vname;
    try {
      vname = ln.split('=')[0].trim();
    }
    catch (e) { /* no parse error here */ }
    if (vname) {
      vars[vname] = applyFunction(vars[name],args,vars);
      return vars[vname];
    }
    return applyFunction(vars[name],args,vars);
  }
  else {
    return interpLogicExpr(vars,ln);
  }
};

var interpPrint = function (vars,ln) {
    ln = ln.split("print")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.trim();
    ln = interpLogicExpr(vars,ln);
    var s = logicUtils.println(ln);
    console.log(s);
};

var interpAssign = function (vars,ln) {
    ln = ln.split("=");
    var lh = ln[0].trim();
    var rh = interpExpr(vars,ln[1]);
    vars[lh] = rh;
};

var alpha = ['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];

var replaceUniques = function (vars,ln) {
  var u = ln.match(/UNIQUE\d/g);
  if (!u) { return ln; }
  u.forEach(function (un) {
    var special = alpha[Math.floor(Math.random()*alpha.length)] + alpha[Math.floor(Math.random()*alpha.length)];
    ln = ln.replace(new RegExp(un,'g'),special);
  });
  return ln;
};

var interpLogicExpr = function (vars,ln) {
  ln = replaceUniques(vars,ln);
  if (ln.indexOf("&")>0) {
        return mult(vars,ln);
    }
    if (ln.match("simplify")) {
        return simplify(vars,ln);
    }
    if (ln.match("replace")) {
        return replace(vars,ln);
    }
    if (ln.match("forall") || ln.match("thereis")) {
        return logicUtils.compileLine(ln);
    }
    return vars[ln.trim()];
};

var simplify = function (vars,ln) {
    ln = ln.split("simplify")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.trim();
    var v = interpLogicExpr(vars,ln);
    var m = logicUtils.removeContradictions(v.matrix);
    v.matrix = m;
    return v;
};

var replace = function (vars, ln) {
    ln = ln.split("replace")[1];
    ln = ln.split("(")[1];
    ln = ln.split(")")[0];
    ln = ln.split(",");
    var prop = interpLogicExpr(vars,ln[0].trim());
    var to = ln[1].trim();
    var from = ln[2].trim();
    return logicUtils.replaceVar(prop,to,from);
};

var mult = function (vars,ln) {
    ln = ln.split("&");
    var op1 = ln[0].trim();
    var op2 = ln[1].trim();
    op1= interpLogicExpr(vars,op1);
    op2 = interpLogicExpr(vars,op2);
    return logicUtils.multiply(op1,op2);
};

var file = process.argv[2];
var fs = require('fs');
var s = fs.readFileSync(file);
interp(s.toString());

