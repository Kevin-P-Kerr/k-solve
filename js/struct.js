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
      var perms = permute(e);
      var that = this;
      perms.forEach(function (e) { 
        exprs.push(that.replace(e));
      });
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

var permute = function (input) {
  var base = input.length;
  var permutations = [];
  if (!base) { return []; }
  var i = base;
  var first = [];
  while (i--) {
    first.push(input[0]);
  }
  permutations.push(first);
  i = getBaseNumber(base);
  i.addOne();
  var n;
  var a;
  while (!i.isZero()) {
    n=0;
    a= [];
    for (;n<base;n++) {
      a.push(input[i.getDigit(n)]);
    }
    permutations.push(a);
    i.addOne();
  }
  return permutations;
}

var getBaseNumber = function (n) {
  var obj = {};
  var digits = [];
  var i = n;
  while (i--) { digits.push(0); }
  var addOne = function () {
    var helper = function (digit) {
      if (digit >= n) { return; }
      var x = digits[digit];
      x++;
      if (x >= n) { x=0; helper(digit+1); }
      digits[digit] = x;
    }
    helper(0);
  }
  var isZero = function () { 
    i = 0;
    ii = n;
    for (;i<ii;i++) {
      if (digits[i] >0) { return false; }
    }
    return true;
  };
  var getDigit = function(n) {
    return digits[n];
  }
  obj.addOne = addOne;
  obj.isZero = isZero;
  obj.getDigit = getDigit;
  return obj;
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
axioms.push(new Axiom("(A=A)",["A"]));
axioms.push(new Axiom("(A-A=0)",["A"]));
axioms.push(new Axiom("(B+A=A+B)",["A","B"]));
axioms.push(new Axiom("[A+B=C D+B=C B=0 (A=D)]",["A","B","C","D"]));
axioms.push(new Axiom("[A+B=A (B=0)]",["A","B"]));
axioms.push(new Axiom("[A+0=B (B=A)]",["A","B"]));
axioms.push(new Axiom("[A+B=C (A=C-B)]",["A","B","C"]));
axioms.push(new Axiom("[A=B (A+C=B+C) ]",["A","B","C"]));
axioms.push(new Axiom("[A+B=C (A=C-B) ]",["A","B","C"]));
axioms.push(new Axiom("[A=B B=C (A=C) ]",["A","B","C"]));
axioms.push(new Axiom("[A=B (B=A) ]",["A","B"]));
axioms.push(new Axiom("(A-0=A)",["A"]));
axioms.push(new Axiom("(0-A=0)",["A"]));
axioms.push(new Axiom("[A+B=C (B=C-A)]",["A","B","C"]));

var generateOp = function (code,one,two,ret) {
    var x = [one,two];
    var p = permute(x);
    p.forEach(function (pair) {
        var n = {type:"opExpr",val:code};
        n.left = parse(tokenize(pair[0]));
        n.right = parse(tokenize(pair[1]));
        console.log(toString(n));
        ret.push(toString(n));
    });
    return ret;
};

var getNums = function (gens) {
    var ret = [];
    gens.forEach(function (construct) {
        ret.push(construct);
    });
    var i =0;
    var ii = gens.length-2;
    for (;i<=ii;i++) {
        generateOp("-",gens[i],gens[i+1],ret);
        generateOp("+",gens[i],gens[i+1],ret);
    }
    return ret;
};

var stringNums = function (nums) {
    var ret= [];
    nums.forEach(function (n) { ret.push(toString(n)); });
    return ret;
};

var calc = function (trueFacts,falseFacts,generators) {
  var nums = getNums(generators);
  console.log(nums);
  question = "";
  var sheet = [];
  var instances = [];
  console.log("g axioms");
  axioms.forEach(function (ax) { sheet.push(ax.generate(nums)); });
  console.log("got axioms");
  falseFacts.forEach(function (fact) { question += "[ "+fact+" ]"});
  sheet.forEach(function (scheme) {
      console.log(scheme.length);
      scheme.forEach(function (instance) { if(instances.indexOf(instance) < 0) {question += (instance + " "); instances.push(instance);}});
    });
  trueFacts.forEach(function (fact) { question += "( "+fact+" )"});
  console.log("question is");
  console.log(question);
  fs.writeFileSync("./question.test",question);
  var answer = prune(solve(question,false));
  return answer;
};

var prune = function (answer) {
  var na = [];
  var tna = [];
  answer[0][0].forEach(function (prop) {
    if (prop.match("=") && tna.indexOf(prop) <0) {
      tna.push(prop);
    }
  });
  na[0] = tna;
  var fna = [];
  answer[0][1].forEach(function (prop) {
    if (prop.match("=") && fna.indexOf(prop) <0) {
      fna.push(prop);
    }
  });
  na[1] = fna;
  return na;
};

var append = function (problem, answers) {
  problem += "\n";
  answers[0][0].forEach(function (a) {
    problem += ("("+a+")"+"\n");
  });
  answers[0][1].forEach(function (a) {
    problem += ("["+a+"]"+"\n");
  });
  return problem;
};

console.log("here it is");
//var hih = sequentialCalc([],["0=3"],["a+b=0","a+c=3","c=0"]);
var hih = calc(["a+b=0","a+c=3"],["0=3"],["a","b","c","0","3"]);
console.log(hih);
var ceqthree = function () {
  var problem = "";
  problem += "(a+b=0)\n";
  problem += "(a+c=3)\n";
  problem +=  axioms[7].replace(["a","0","c"]);
  problem += "\n";
  problem +=  axioms[10].replace(["a+c","0+c"]);
  problem += "\n";
  problem += axioms[7].replace(["a","0","b"]);
  problem +=  axioms[10].replace(["a+c","0+c"]);
  problem +=  axioms[9].replace(["0+c","a+c","3"]);
  problem +=  axioms[6].replace(["0","c","3"]);
  problem +=  axioms[11].replace(["3"]);
  problem +=  axioms[9].replace(["c","3-0","3"]);
  problem +=  axioms[8].replace(["a","b","0"]);
  problem +=  axioms[13].replace(["a","b","0"]);
  problem +=  axioms[12].replace(["b"]);
  problem +=  axioms[9].replace(["a","0-b","0"]);
  var x = solve(problem,false);
  problem = append(problem,x);
  console.log(problem);
}

