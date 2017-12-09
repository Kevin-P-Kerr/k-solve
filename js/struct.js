var fs = require('fs');
var solve = require('./sat.js');

var lits = {};
lits.numLit = /^[0-9]+/;
lits.varLit = /^[a-zA-Z]+/;
lits.plusLit = /^\+/;
lits.minusLit = /^-/;
lits.equalLit = /^=/;

var tokenize = function (str) {
  var tokens = [];
  var k,v,l;
  while (str.length) {
    for (k in lits) {
      v = lits[k];
      if (str.match(v)) {
        l = str.match(v)[0];
        tokens.push({val:l,type:k});
        str = str.split(v)[1];
      }
    }
  }
  return tokens;
};

var parseNum =  function (tokens) {
  var token = tokens.peek();
  if (token.type != "numLit" && token.type != "varLit") {
    throw new Error("parse error");
  }
  var next = tokens.peek();
  if (next && (next.type == "plusLit" || next.type == "minusLit")) {
    var right = parseNum(tokens);
    var op = {};
    op.type = "opExpr";
    op.val = next.val;
    op.left = token;
    op.right = right;
    return op;
  }
  else {
    tokens.push(next);
    return token;
  }
};

var makeTH = function (tokens) {
  var peek = function () { return tokens.shift(); };
  var push = function (t) { tokens.unshift(t); };
  return {peek:peek,push:push}; 
};

var parse = function (tokens) {
  var th = makeTH(tokens);
  var helper = function (th) {
    var ast = parseNum(th);
    var token = th.peek();
    if (token) {
      if (token.type == "equalLit") {
        var right = parseNum(th);
        var eq = {type:"equalExpr"};
        eq.left = ast;
        eq.right = right;
        return eq;
      }
      else {
        throw new Error("parse error");
      }
    }
    return ast;
  };
 return helper(th);
};

var toString = function (ast) {
  if (ast.type == "equalExpr") {
    return toString(ast.left)+"="+toString(ast.right);
  }
  if (ast.type == "opExpr") {
    return toString(ast.left)+ast.val+toString(ast.right);
  }
  return ast.val;
};

var Axiom = function (form,args) {
  this.replace = function (expressions) {
    var s = form;
    if (args.length != expressions.length) { throw new Error(); }
    var i = 0;
    var ii = args.length;
    for (;i<ii;i++) {
      while (s.match(args[i])) {
        s = s.replace(args[i],expressions[i]);
      }
    }
    return s;
  };
  this.generate = function (numericExpressions) {
    ne = copy(numericExpressions);
    var exprs = [];
    if (numericExpressions.length < args.length) { return exprs; }
    if (numericExpressions == args.length) { return [this.replace(numericExpressions)] }
    var arglen = args.length;
    var i =1;
    var n;
    var e = [];
    var ii = numericExpressions.length-(arglen-1);
    for (;i<=ii;i++) {
      e = [numericExpressions[0]];
      n=0;
      for(;n<arglen-1;n++) {
        e.push(numericExpressions[i+n]);
      }
      exprs.push(this.replace(e));
    }
    ne.shift();
    var more = this.generate(ne);
    more.forEach(function (e) { exprs.push(e); });
    return exprs;
  };
};
var copy =  function (arr1) {
  var ret = [];
  arr1.forEach(function (el) { ret.push(el); });
  return ret;
};
var generateNums = function (exp) {
  var nums = [];
  if (exp.type == "equalExpr" || exp.type == "opExpr") {
    nums.push(toString(exp.left));
    nums.push(toString(exp.right));
    var morenums = generateNums(exp.left);
    morenums.forEach(function (n) {
      nums.push(n); });
    morenums = generateNums(exp.right);
    morenums.forEach(function (n) {
      nums.push(n); });
  }
  else if (exp.type == "numLit" || exp.type == "varLit") {
    nums.push(toString(exp));
  }
  else {
    throw new Error();
  }
  var realnums = [];
  nums.forEach(function (num) { 
    if (realnums.indexOf(num) >= 0) { return; }
    realnums.push(num);
  });
  return realnums;
};


var axioms = [];
//axioms.push(new Axiom("[A+B (B+A B+A=A+B)]",["A","B"]));
//axioms.push(new Axiom("[A+B=A (B=0)]",["A","B"]));
axioms.push(new Axiom("[A+B=C (B=C-A A=C-B)]",["A","B","C"]));
axioms.push(new Axiom("[A=B (A+C=B+C) ]",["A","B","C"]));
axioms.push(new Axiom("[A=B B=C (A=C) ]",["A","B","C"]));
axioms.push(new Axiom("[A=B (B=A) ]",["A","B"]));

var statement = "a+b=0";
var  p = parse(tokenize(statement));
var num = generateNums(p);
var sheet = [];
console.log(num);
axioms.forEach(function (ax) {console.log('**'); console.log(ax.generate(num)); });
  
