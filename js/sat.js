var fs = require('fs');
// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;
var LBRAK = 3;
var RBRAK = 4;

var DEBUG = true;
var setDebug = (function () {
    var c = console.log;
    return function () {
        if (DEBUG) {
            console.log = c;
        }
        else {
            console.log = function () {};
        }
    };
})();

setDebug();
// GLOBAL
var conflictTable = {};
var shapeUtil = (function () {
  var shapes = [];
  var register = function (clauses) {
    return;
    var str = printcl(copyClean(clauses));
    if (shapes.indexOf(str) >= 0) { return; }
    shapes.push(str);
  };
  var check = function (clauses) {
    var str = printcl(copyClean(clauses));
    return shapes.indexOf(str) >= 0;
  }
  return {register:register,check:check};
})();
//
var iswhite = function (c) {
    return c == ' ' || c == '\n' || c == '\t';
};

var isValidVarChar = function (c) {
    return !iswhite(c) && c != '(' && c != ')' && c != '[' && c != ']';
};

var tokenize = function (str) {
    var tokens = [];
    var i=0;
    var ii = str.length;
    for (;i<ii;i++) {
        var c = str[i];
        if (iswhite(c)) {
            continue;
        }
        if (c == '(') {
            tokens.push({type:LPAREN});
        }
        else if (c ==')') {
            tokens.push({type:RPAREN});
        }
        else if (c=='[') {
            tokens.push({type:LBRAK});
        }
        else if (c == ']') {
            tokens.push({type:RBRAK});
        }
        else {
            var name = '';
            while (isValidVarChar(str[i])) {
                name += str[i];
                i++;
            }
            i--;
            tokens.push({type:VAR,val:name});
        }
    }
    return tokens;
};

var parseL = function (token,th) {
    var clause = {};
    clause.subClauses = [];
    clause.type = token.type;
    var closingType;
    if (token.type == LPAREN)  {
        closingType = RPAREN;
    }
    else {
        closingType = RBRAK;
    }
    var currentToken;
    while ((currentToken = th()) && currentToken.type != closingType) {
        if (currentToken.type == VAR) {
            clause.subClauses.push(currentToken);
        }
        else if (currentToken.type == LPAREN) {
            clause.subClauses.push(parseL(currentToken,th));
        }
        else if (currentToken.type == LBRAK) {
            clause.subClauses.push(parseL(currentToken,th));
        }
        else {
            throw new Error("can't parse!");
        }
    }
    return clause;
};

var parse = function (tokens) {
    var th = function () { return tokens.shift(); };
    var clauses = [];
    var currentToken;
    while ((currentToken = th())) {
        if (currentToken.type == VAR) {
            clauses.push(currentToken);
        }
        else if (currentToken.type == LPAREN) {
            clauses.push(parseL(currentToken,th));
        }
        else if (currentToken.type == LBRAK) {
            clauses.push(parseL(currentToken,th));
        }
        else {
            console.log(clauses);
            console.log(currentToken);
            throw new Error("whoops");
        }
    }
    return clauses;
};

var simplify = function (v, clauses,negative) {
    var newClauses = [];
    clauses.forEach(function (clause) {
        if (isAtomic(clause)) {
            if (clause.val == v) {
                return;
            }
        }
        else if (!negative && clausePositiveContains(v,clause)) {
            return;
        }
        else if (negative && clauseNegativeContains(v,clause)) {
          return;
        }
        else if (clauseConflicts(v,clause,negative)) {
          newClauses.push(null);
          return;
        }
        newClauses.push(copy(v,clause));
    });
    var i =0;
    var ii = newClauses.length;
    for (;i<ii;i++) {
        if (newClauses[i] == null) {
            return null; // there was a conflict
        }
    }
    var simpleNewClauses = [];
    newClauses.forEach(function (c) {
      if (isAtomic(c)) {
            simpleNewClauses.push(c);
        }
        else {
            var nc = reduce(c);
            if (isEmpty(nc)) {
              return;
            }
            simpleNewClauses.push(reduce(c));
        }
    });
    return simpleNewClauses;
};

var isReducible = function (clause) {
    return isSingleton(clause) && clause.subClauses[0].type != VAR;
};

// we know this won't be called on atomic clauses
// [([([a])])] = [a] 
// 
var reduce = function (clause) {
    var reducedClause = {};
    if (!isReducible(clause)) {
        reducedClause.type = clause.type;
        reducedClause.subClauses = [];
        clause.subClauses.forEach(function (c) {
            if (isAtomic(c)) {
                reducedClause.subClauses.push(c);
            }
            else {
                var rdc = reduce(c);
                if (!isEmpty(rdc)) {
                    // double negative
                    if (rdc.type == clause.type) {
                        rdc.subClauses.forEach(function (rdcsc) {
                            reducedClause.subClauses.push(rdcsc);
                        });
                    }
                    else {
                        reducedClause.subClauses.push(rdc);
                    }
                }
            }
        });
        return reducedClause;
    }
    else {
        return reduce(clause.subClauses[0]);
    }
};

var clausePositiveContains = function (v,clause) {
    if (isAtomic(clause)) {
      return false;
    }
    var parenFlag = clause.type == LPAREN;
    if (isSingleton(clause) && clause.subClauses[0].val == v) {
      return parenFlag;
    }
    var i = 0;
    var ii = clause.subClauses.length;
    for (;i<ii;i++) {
      if (clausePositiveContains(v,clause.subClauses[i])) {
        return true;
      }
    }
    return false;
};

var clauseNegativeContains = function (v,clause) {
    if (isAtomic(clause)) {
      return false;
    }
    var parenFlag = clause.type == LBRAK;
    var i = 0;
    var ii = clause.subClauses.length;
    var currentClause;
    for (;i<ii;i++) {
      currentClause = clause.subClauses[i];
      if (isAtomic(currentClause) && currentClause.val == v) {
        return parenFlag;
      }
      if (clauseNegativeContains(v,clause.subClauses[i])) {
        return true;
      }
    }
    return false;
};

var clauseConflicts = function (v,c,negative) {
  var i,ii,sc;
  if (isAtomic(c)) { return false; }
  if (negative) {
    if (c.type == LPAREN) {
      for (i=0,ii=c.subClauses.length;i<ii;i++) {
        sc= c.subClauses[i];
        if (isAtomic(sc) && sc.val == v) {
          return true;
        }
        else {
          if (clauseConflicts(v,sc,negative)) { return true; }
        }
      }
    }
  }
  else {
    if (c.type == LBRAK) {
      if (isSingleton(c) && c.subClauses[0].val == v) {
        return true;
      }
    }
  }
  return false;
};

var isSingleton = function (c) {
    return c.subClauses.length == 1;
};

var isEmpty = function (c) {
    return !isAtomic(c) && (c.subClauses.length == 0 || 
        (isSingleton(c) && isEmpty(c.subClauses[0])));
};

var isAtomic = function (c) {
    return !c.subClauses || c.type == VAR;
}

var copyClean = function (clauses) {
  var getVar = (function () { var i =0; return function () { return i+""; } })();
  var newVars = {};
  var helper = function (clauses) {
    var newClauses = [];
    clauses.forEach(function (c) {
      var newClause = {};
      if (isAtomic(c)) {
        newClause.type == VAR;
        newClause.val =  newVars[c.val] ? newVars[c.val] : getVar();
        if (!newVars[c.val]) { newVars[c.val] =  newClause.val; }
      }
      else {
        newClause.type = c.type;
        newClause.subClauses = helper(c.subClauses);
      }
      newClauses.push(newClause);
    });
    return newClauses;
  };
  return helper(clauses);
};

// we know if this method is called the clause does not simply contain the val
// we also know the clause does not conflict
var copy = function (v,clause) {
    var copyClause = {type:clause.type};
    if (clause.type == LPAREN || clause.type == LBRAK) {
        copyClause.subClauses= [];
        clause.subClauses.forEach(function (c) {
            var cpy = copy(v,c);
            if (cpy == null) {
                return;
            }
            copyClause.subClauses.push(cpy);
        });
    }
    else if (clause.type == VAR) {
        if (clause.val == v) {
            var name = clause.val;
            return null;
        }
        else {
            copyClause.val = clause.val;
        }
    }
    else {
        throw new Error("what");
    }
    return copyClause;
};

var getVariableOrder = function (clauses) {
  var helper = function (variables, clauses) {
    clauses.forEach(function (c) {
      if (isAtomic(c)) {
        if (variables[c.val]) {
          variables[c.val] += 1;
        }
        else {
          variables[c.val] = 1;
        }
      }
      else {
        helper(variables,c.subClauses);
      }
    });
    return variables;
  };
  var variables =  helper({},clauses);
  var singlePositives = getSinglePositives(clauses);
  var singleNegatives = getSingleNegatives(clauses);
  singlePositives.forEach(function (p) {
      variables[p] = Infinity;
  });
  singleNegatives.forEach(function (p) {
      variables[p] = Infinity;
  });
  var arr = [];
  var k;
  for (k in variables) {
    var rec = {};
    rec.name = k;
    rec.count = variables[k];
    arr.push(rec);
  }
  arr.sort(function (a,b) {
    if (a.count == Infinity) {
        return -1;
    }
    if (b.count == Infinity) {
        return 1;
    }
    if (a.count == -Infinity) {
        return 1;
    }
    if (b.count == -Infinity) {
        return -1;
    }
    if (conflictTable[a.name] && Math.round(Math.random()*100) > conflictTable[a.name]) {
        return -1;
    }
    if (conflictTable[b] && Math.round(Math.random()*100) > conflictTable[b]) {
        return 1;
    }
    if (Math.round(Math.random() * 100) < 5) {
        return 1;
    }
    if (a.count < b.count) {
      return 1;
    }
    else {
      return -1;
    }
  });
  var ret  =[];
  arr.forEach(function (a) {
    ret.push(a.name);
  });
  return ret;
};

var fullyResolved = function (clauses,falseVariables) {
  return false;
  var  i =0;
  var ii = clauses.length;
  var c;
  var falses = [];
  for (;i<ii;i++) {
    c = clauses[i];
    if (!(isAtomic(c) || (isSingleton(c) && c.type != LPAREN))) {
      return false;
    }
    else if (isSingleton(c)) { falses.push(c.subClauses[0].val) }
  }
  falses.forEach(function (f) { falseVariables.push(f); });
  return true;
};

var printcl = function (clauses) {
  var lineLevel = -1;
  var helper = function (clauses) {
    var str = '';
    lineLevel++;
    clauses.forEach(function (c) {
      if (isAtomic(c)) {
        str += (c.val+" ");
      }
      else if (c.type == LPAREN) {
        str += '(';
        str += helper(c.subClauses);
        str += ')';
      if (lineLevel ==0) { str += "\n"; }
      }
      else if (c.type == LBRAK) {
        str += '[';
        str += helper(c.subClauses);
        str += ']';
      if (lineLevel ==0) { str += "\n"; }
      }
      else {
        throw new Error('yikes');
      }
    });
    lineLevel--;
    return str;
  };
  return helper(clauses);
};

var print = function (clauses) {
  console.log(printcl(clauses));
};

var solvePartial = function (variable, clauses,trueVars,falseVars,positive) {
  console.log('removing ' + variable+' '+positive);
  // at this point, we might be trying to assign an already discovered variable to its opposite value
  if (positive && falseVars.indexOf(variable) >= 0) {
    return false;
  }
  if (!positive && trueVars.indexOf(variable) >= 0) {
    return false;
  }
  var cpy = simplify(variable,clauses,!positive);
  if (cpy == null) {
    console.log("discovered conflict",variable,positive);
    print(clauses);
    return false;
  }
  if (fullyResolved(cpy,falseVars)) {
    return true;
  }
  return solve(cpy,trueVars,falseVars);
};

var getSinglePositives = function (clauses) {
    var pos = [];
    var helper = function (clauses) {
        clauses.forEach(function (c) {
            if (!isAtomic(c)) {
                if (isSingleton(c) && !isReducible(c)) {
                    if (c.type == LPAREN) {
                        pos.push(c.subClauses[0].val);
                    }
                }
            }
        });
    }
    helper(clauses);
    return pos;
};

var getSingleNegatives = function (clauses) {
    var pos = [];
    var helper = function (clauses) {
        clauses.forEach(function (c) {
            if (!isAtomic(c)) {
                if (isSingleton(c) && !isReducible(c)) {
                    if (c.type == LBRAK) {
                        pos.push(c.subClauses[0].val);
                    }
                }
            }
        });
    }
    helper(clauses);
    return pos;
};

var hasConflicts = function (clauses,trueVars,falseVars) {
    var singlePositives = getSinglePositives(clauses);
    var singleNegatives = getSingleNegatives(clauses);
    var i = 0;
    var ii = singlePositives.length;
    for (;i<ii;i++) {
        if (singleNegatives.indexOf(singlePositives[i]) >= 0) {
            console.log("found conflict: "+singlePositives[i]);
            var n = singlePositives[i];
            return true;
        }
    }
    var tv,fv;
    for(i=0,ii=trueVars.length;i<ii;i++) {
      tv = trueVars[i];
      if (singleNegatives.indexOf(tv) >=0 || falseVars.indexOf(tv) >=0 ) {
        console.log("found conflict " + tv);
        return true;
      }
    }
    for(i=0,ii=falseVars.length;i<ii;i++) {
      fv = falseVars[i];
      if (singlePositives.indexOf(fv) >= 0 || trueVars.indexOf(fv) >=0) {
        console.log("found conflict " + fv);
        return true;
      }
    }
    return false;
};

var pruneClauses = function (clauses,trueVars) {
  var singlePositives = getSinglePositives(clauses);
  var singleNegatives = getSingleNegatives(clauses);
  var allPositives = [];
  trueVars.forEach(function (v) { allPositives.push(v); });
  singlePositives.forEach(function (v) { allPositives.push(v); });
   var i,ii,v;
   for (i=0,ii=allPositives.length;i<ii;i++) {
      v = allPositives[i];
      clauses = eliminate(v,clauses,false);
      if (!clauses) {
        return false;
      }
   }
   for (i=0,ii=singleNegatives.length;i<ii;i++) {
      v = singleNegatives[i];
      clauses = eliminate(v,clauses,true);
      if (!clauses) {
        return false;
      }
   }
   return [clauses,singlePositives,singleNegatives];
};

var eliminate = function (v,clauses,negative) {
    var newClauses = [];
    clauses.forEach(function (clause) {
        if (isAtomic(clause)) {
            if (clause.val == v) {
                return;
            }
        }
        else if (!negative && clausePositiveContains(v,clause)) {
            return;
        }
        else if (negative && clauseNegativeContains(v,clause)) {
          return;
        }
        newClauses.push(clause);
    });
    var i =0;
    var ii = newClauses.length;
    for (;i<ii;i++) {
        if (newClauses[i] == null) {
            return null; // there was a conflict
        }
    }
    return newClauses;
};

var solve = function (clauses,trueVars,falseVars) {
  console.log("solving");
  print(clauses);
 // console.log("current true vars",trueVars);
 // console.log("current false vars",falseVars);
  trueVars = trueVars || [];
  falseVars = falseVars || [];
  if (hasConflicts(clauses,trueVars,falseVars)) {
    return false;
  }
  pruneInfo = pruneClauses(clauses,trueVars);
  clauses = pruneInfo[0];
  pruneInfo[1].forEach(function (truth) {
    trueVars.push(truth);
  });
  pruneInfo[2].forEach(function (falsity) {
    falseVars.push(falsity);
  });
  if (clauses.length == 0) {
    return [trueVars,falseVars];
  }
  var variables = getVariableOrder(clauses);
  var i = 0;
  var ii = variables.length;
  var v;
  var hasFalsity;
  var hasTruth;
  for(; i<ii; i++ ) {
    v = variables[i];
    hasFalsity = falseVars.indexOf(v) >= 0;
    hasTruth = trueVars.indexOf(v) >= 0;
    if (hasFalsity && hasTruth) {
      // sanity check
      console.log(v);
      throw new Error();
    }
    falseVars.push(v);
    
    if ((!hasTruth) && solvePartial(v,clauses,trueVars,falseVars,false)) {
      return [trueVars,falseVars];
    }
    else {
      falseVars.pop();
      trueVars.push(v);
      if ((!hasFalsity) && solvePartial(v,clauses,trueVars,falseVars,true)) {
        return [trueVars,falseVars];
      }
      else {
        trueVars.pop();
      }
    }
  }
  pruneInfo[1].forEach(function (el) { trueVars.pop(); });
  pruneInfo[2].forEach(function (el) { falseVars.pop();});
  return false;
};

var getSubProblems = function (clauses) {
    var subProblems = [];
    var marked = [];
    var helper = function (cls) {
        var originalLen = cls.length;
        var variables = getVariableOrder(cls);
        variables.forEach(function (v) {
            var i = 0;
            var ii = clauses.length;
            for (;i<ii;i++) {
                if (marked[i]) { continue; }
                var c = clauses[i];
                if (contains(c,v)) {
                    marked[i] = true;
                    cls.push(c);
                }
            }
            if (cls.length > originalLen) {
                helper(cls);
            }
        });
    };
    var  i =0;
    var ii = clauses.length;
    for (;i<ii;i++) {
        if (marked[i]) { continue; }
        var sub = [clauses[i]];
        marked[i] = true;
        subProblems.push(sub);
        helper(sub);
    }
    return subProblems;
};

var contains = function (cl,v) {
    if (isAtomic(cl)) {
        return cl.val == v;
    }
    var  i = 0;
    var ii = cl.subClauses.length;
    for (;i<ii;i++) {
        if (contains(cl.subClauses[i],v)) {
            return true;
        }
    }
    return false;
};

var metaSolve = function (clauses,trueVars,falseVars) {
    trueVars = trueVars || [];
    falseVars = falseVars || [];
    console.log("getting sub problems");
    console.log(clauses.length + " total clauses");
    var v = getVariableOrder(clauses);
    console.log(v.length + " total variables");
    //var problems = getSubProblems(clauses);
    var problems = [clauses];
    var  i = 0;
    var ii = problems.length;
    for (;i<ii;i++) {
        if (!solve(problems[i],trueVars,falseVars)) {
            return false;
        }
    }
    return [trueVars,falseVars];
};

var printAnswer = function (answer,clauses) {
    var d = DEBUG;
    DEBUG = true;
    setDebug();
    if (!answer) { console.log("no solution"); }
    else {
        answer = getAnswer(answer,clauses);
        console.log("positive vars: ");
        console.log(answer[0][0]);
        console.log("negative vars:");
        console.log(answer[0][1]);
        console.log("undetermined vars:");
        console.log(answer[1]);
    }
    DEBUG = d;
    setDebug();
};

var getAnswer = function (answer,clauses) {
  if (!answer) { return null; }
  var variables = getVariableOrder(clauses);
  var undetermined = [];
  var trueVariables = answer[0];
  var falseVariables = answer[1];
  variables.forEach(function (v) {
      if (trueVariables.indexOf(v) < 0) {
          if (falseVariables.indexOf(v) <0) {
            undetermined.push(v);
          }
      }
  });
  return [answer,undetermined];
}


var main = function () {
 var t = JSON.parse(fs.readFileSync("./parsed.txt").toString());
  console.log("solving");
 var betterq = search(t,"c=3",[]);
 addAllPositives(t,betterq);
 fs.writeFileSync("./betterq.test",printcl(betterq));
 var answer = solve(betterq);
 fs.writeFileSync("./answer.txt",JSON.stringify(answer));
  //printAnswer(answer,t);
}

var addAllPositives = function (parsed,ls) {
    console.log(parsed.length);
    parsed.forEach(function (cl) { if (cl.type == LPAREN) { ls.push(cl); }});
};

var search = function (parsed,v,consumed,limit) {
    limit = limit || 0;
    if (limit > 10000) {
        return [];
    }
    console.log("searching for " +v);
    var clauses =[];
    consumed.push(v);
    parsed.forEach(function(c) {
        if (clausePositiveContains(v,c)) {
            clauses.push(c);
            c.subClauses.forEach(function (cc) {
                if (isAtomic(cc) && consumed.indexOf(cc.val) < 0 && limit<10) {
                    limit++;
                    var x = search(parsed,cc.val,consumed,limit);
                    x.forEach(function (cl) { clauses.push(cl); });
                }
            });
        }
    });
    return clauses;
}
main();


module.exports = function (str,debug) {
  var d = DEBUG;
  DEBUG = debug;
  setDebug();
  var tokens = tokenize(str);
  var parsed = parse(tokens);
  var answer = metaSolve(parsed);
  answer = getAnswer(answer,parsed);
  DEBUG = d;
  setDebug();
  return answer;
};
