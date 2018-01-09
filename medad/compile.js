var sat = require("../js/sat.js");
var getAlphaGen = function () {
    var c = 'a';
    var prefix = '';
    return function () {
        if (c == 'z') {
            c = 'a';
            prefix = prefix.length == 0 ? 'a' : String.fromCharCode(prefix.charCodeAt(0)+1);
        }
        var d = prefix+c;
        c = String.fromCharCode(c.charCodeAt(0) + 1);
        return d;
    };
};

var getNumGen = function () {
    var n = 0;
    return function () {
        var x = n;
        n++;
        return x;
    };
};

var compile2viz = function (src,nodeMap) {
    var prelude = "digraph G { ";
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    var subclusterEnum = getAlphaGen();
    subGraphs = makeTokens(tokenize(subGraphs));
    var compileSubGraph = function (stem,graphColor,nodeColor, tokens,connections) {
        stem += "style=filled; color="+graphColor+"; node [style=filled,color="+nodeColor+"];";
        var token = tokens();
        while (token && token.type != RPAREN) {
            if (token.type == LPAREN) {
                var newNodeColor = getNextColor(nodeColor);
                var newGraphColor = getNextColor(graphColor);
                stem += compileSubGraph("subgraph cluster_"+subclusterEnum()+ " {",newGraphColor,newNodeColor,tokens);
            }
            else if (token.type == VAR) {
                var nodeName = token.val;
                var nodeLabel = nodeMap[nodeName];
                if (!nodeLabel) { nodeLabel = nodeName; }
                stem += nodeName + "[label="+nodeLabel+";]" +";";
            }
            token = tokens();
        }
        if (connections) {
            connections = connections.split('\t');
            connections.forEach(function (con) {
                con = con.split(' ');
                var ant = con[0];
                var cons = con[1]
                stem += (ant+ " -> " + cons +"; ");
            });
        }
        stem += " }";
        return stem;
    }
    var digraph = "digraph G { ";
    var n = compileSubGraph(digraph,"white","white",subGraphs,connections);
    return n;
};

var getNextColor = function (color) {
    if (color == "white") {
        return "lightgrey";
    }
    if (color == "lightgrey") {
        return "white";
    }
    throw new Error();
};

var makeTokens = function (tokens) {
    return function () {
        var x = tokens.shift();
        return x;
    }
};

// constants 
var LPAREN = 0;
var RPAREN = 1;
var VAR = 2;
var NEGATE = 3;
var PRED = 4;
var THEREIS = 5;
var FORALL = 6;
var MULT = 7;
var PLUS = 8;
var COLON = 9;

var iswhite = function (c) {
    return c == ' ' || c == '\n' || c == '\t';
};

var isValidVarChar = function (c) {
    return !iswhite(c) && c!='*' && c!=':' && c != '(' && c != ')' && c != '[' && c != ']';
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
        else if (c == '+') {
            tokens.push({type:PLUS});
        }
        else if (c == ':') {
            tokens.push({type:COLON});
        }
        else if (c == '~') {
            tokens.push({type:NEGATE});
        }
        else if (c == '*') {
            tokens.push({type:MULT});
        }
        else {
            var name = '';
            while (isValidVarChar(str[i]) && i<ii) {
                name += str[i];
                i++;
            }
            i--;
            if (name == 'forall') {
                tokens.push({type:FORALL});
            }
            else if (name == 'thereis') {
                tokens.push({type:THEREIS});
            }
            else {
                tokens.push({type:VAR,val:name});
            }
        }
    }
    return tokens;
};

var makeConnectionsMap = function (connections,varGen) {
    connections = connections.split('\t');
    varGen = varGen || getAlphaGen();
    var map = {};
    map.inverse = {};
    connections.forEach(function (con) {
        con = con.split(' ');
        var v = varGen();
        var ant = con[0];
        var r = con[1];
        if (!map[ant]) {
            map[ant] = [];
        }
        if (!map[r]) {
            map[r] = [];
        }
        if (r == ant) {
            if (!map[ant]) {
                map[ant] = [v];
            }
            else {
                map[r].push(v);
            }
        }
        else {
            map[r].push(v);
            map[ant].push(v);
        }
        map.inverse[v] = [ant,r];
    });
    return map;
};

var addQuantifiers = function (src,connections) {
    var quants = [];
    var subGraphs = src[0];
    subGraphs = makeTokens(tokenize(subGraphs));
    var helper = function (tokens) {
        token = tokens();
        var inter = [];
        while (token && token.type != RPAREN) {
            if (token.type == LPAREN) {
                inter.push(helper(tokens));
            }
            else if (token.type == VAR) {
                inter.push(token.val);
            }
            token = tokens();
        }
        return inter;
    };
    var ordered = helper(subGraphs);
    var k,v;
    for (k in connections.inverse) {
        v = connections.inverse[k];
        var a = v[0];
        var b = v[1];
        var n = findHighest(a,b,ordered);
        var qf;
        if (n < 0) { qf = true;} 
        else { qf = n%2==0; }
        addQuant(quants,k,qf);
    }
    return quants;
};

var isArray = function (a) {
    return Object.prototype.toString.call(a).match('Array');
};

var findHighest = function (a,b,ordered) {
    var helper = function (x,o) {
        var i = 0;
        var ii = o.length;
        var s;
        for (;i<ii;i++) {
            s = o[i];
            if (s == x) { return i; }
            if (isArray(s)) {
                if (helper(x,s) >= 0) {
                    return i;
                }
            }
        }
        return -1;
    };
    var first = function (index,a,b,c) {
        var i =0;
        var ii = index.length;
        var ac,bc;
        for (;i<ii;i++) {
            if (index[i] == a || index[i] == b) {
                return c;
            }
            else if (isArray(index[i])) {
                if (helper(a,index[i])>=0) {
                    ac = first(index[i],a,b,c+1);
                }
                if (helper(b,index[i])>=0) {
                    bc = first(index[i],a,b,c+1);
                }
            }
        }
        if (ac && bc) {
            return Math.min(ac,bc);
        }
        return ac ? ac : bc;
    };
    var indexone = helper(a,ordered);
    var indextwo = helper(b,ordered);
    if (indexone != indextwo) { return -1; }
    else {
        var index = ordered[indexone];
        return first(index,a,b,1);
    }
};

var compile2line = function (src,map,gen) {
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    subGraphs = makeTokens(tokenize(subGraphs));
    var lineInternal = {};
    connections = makeConnectionsMap(connections,gen);
    lineInternal.prefix = addQuantifiers(src,connections);
    var compileProp = function (tokens) {
        var token = tokens();
        var props = [];
        while (token && token.type != RPAREN) {
            var prop = {};
            if (token.type == LPAREN) {
                prop.type = NEGATE;
                prop.body = compileProp(tokens);
            }
            else if (token.type == VAR) {
                prop.type = PRED;
                prop.name = map[token.val];
                prop.body = connections[token.val];
            }
            props.push(prop);
            token = tokens();
        }
        return props;
    };
    lineInternal.matrix = compileProp(subGraphs,true);
    return lineInternal;
};

var printProp = function (prop) {
    var p = "";
    if (prop.type == MULT) {
        var first = true;
        prop.body.forEach(function (sp) {
            if (first) {
                first = false;
            }
            else {
                p += "*";
            }
            p += printProp(sp);
        });
    }
    if (prop.type == NEGATE) {
        p = "~(";
        var first = true;
        prop.body.forEach(function (body) {
            if (first) {
                first = false;
                p += printProp(body);
            }
            else {
                p += " + " + printProp(body);
            }
        });
        p += ")";
    }
    else if (prop.type == PRED) {
        if (prop.body.length > 0) {
            p += prop.name+"(";
            prop.body.forEach(function (v) {
                p+=v+" ";
            });
            p+=")";
        }
        else {
            p += prop.name;
        }
    }
    return p;
};

var println = function (line) {
    var str = "";
    line.prefix.forEach(function (pref) {
        if (pref.type == FORALL) {
            str += "forall ";
        }
        else {
            str += "there is ";
        }
        str += pref.val+" ";
    });
    str += ":"
    var first = true;
    line.matrix.forEach(function (prop) {
        if (first) {
            first = false;
            str += printProp(prop);
        }
        else {
            str += " + " + printProp(prop);
        }
    });
    return str;
}; 

var quantContains = function(prefix,val) {
    var i = 0;
    var ii = prefix.length;
    for (;i<ii;i++) {
        if (prefix[i].val == val) { return true;}
    }
    return false;
}; 

var addQuant = function (prefix,val,quantFlag) {
    quant = quantFlag ? FORALL : THEREIS;
    if (quantContains(prefix,val)) {
        return;
    }
    prefix.push({type:quant,val:val});
};

var compileAxioms = function (srcs,map) {
    var lines = [];
    var graphs = [];
    var canonicalGen = getAlphaGen();
    srcs.forEach(function (src) { graphs.push(compile2viz(src,map));  lines.push(compile2line(src,map,canonicalGen)); });
    return [graphs,lines];
};

var multiply = function (a,b) {
    var c = {};
    c.prefix = [];
    a.prefix.forEach(function (p) { c.prefix.push(p); });
    b.prefix.forEach(function (p) { c.prefix.push(p); });
    c.matrix = [];
    a.matrix.forEach(function (aa) {
        b.matrix.forEach(function (bb) {
            var n = {};
            n.type = MULT;
            n.body = [];
            if (aa.type == MULT) {
                aa.body.forEach(function (p) { n.body.push(p); });
            }
            else {
                n.body.push(aa);
            }
            if (bb.type == MULT) {
                bb.body.forEach(function (p) { n.body.push(p); });
            }
            else {
                n.body.push(bb);
            }
            c.matrix.push(n);
        });
    });
    return c;
};

var inPlaceAlter = function (p,t,f) {
    var i = 0;
    var ii = p.prefix.length;
    for (;i<ii;i++) {
        if (p.prefix[i].val == f) {
          p.prefix[i].val = t;
        }
    }
    var helper = function (props) {
        props.forEach(function (subp) {
            if (subp.type == PRED && subp.body.indexOf(f) >= 0) {
                var dex = subp.body.indexOf(f);
                subp.body[dex] = t;
            }
            if (subp.type == MULT) {
                helper(subp.body);
            }
            if (subp.type == NEGATE) {
                helper(subp.body);
            }
        });
    };
    helper(p.matrix);
    // for chaining
    return p;
};

var replace = function (p,t,f) {
    var i = 0;
    var ii = p.prefix.length;
    for (;i<ii;i++) {
        if (p.prefix[i].val == f) {
            break;
        }
    }
    p.prefix.splice(i,1);
    var helper = function (props) {
        props.forEach(function (subp) {
            if (subp.type == PRED && subp.body.indexOf(f) >= 0) {
                var dex = subp.body.indexOf(f);
                subp.body[dex] = t;
            }
            if (subp.type == MULT) {
                helper(subp.body);
            }
            if (subp.type == NEGATE) {
                helper(subp.body);
            }
        });
    };
    helper(p.matrix);
    // for chaining
    return p;
};

var product = function (lns) {
    var base = lns[0];
    var i = 1;
    var ii = lns.length;
    for (;i<ii;i++) {
        base = multiply(base,lns[i]);
    }
    return base;
};

var removeClause = function (p,i) {
    p.matrix.splice(i,1);
    return p;
};

var removeContradictions = function (matrix) {
    var nm = [];
    matrix.forEach(function (prop) {
        var problem = compileProp2Sat(prop,false,{});
        var a = sat.solve(problem);
        if (a.sat) {
            nm.push(prop);
        }
    });
    return nm;
};

// takes a prop with nested negations and returns one with atomic negations
var simplifyProp = function (prop) {
    if (prop.type == NEGATE && prop.body.length > 1) {
        var newProp = {};
        newProp.type = MULT;
        var b = [];
        newProp.body = b;
        prop.body.forEach(function (p) {
            var sp = simplifyProp(p);
            if (sp.type == MULT) {
                sp.body.forEach(function (spp) {
                    if(spp.type == NEGATE) {
                        b.push(spp.body[0]);
                    }
                    else if (spp.type == PRED) {
                        b.push({type:NEGATE,body:[spp]});
                    }
                    else {
                        throw new Error();
                    }
                });
            }
            else if (sp.type == NEGATE) {
                b.push(sp.body[0]);
            }
            else if (sp.type == PRED) {
                b.push({type:NEGATE,body:[sp]});
            }
            else {
                throw new Error();
            }
        });
        return newProp;
    }
    return prop;
};

var getSatVariable = function (prop,prop2satVariable,gen) {
    var key,v;
    key = printProp(prop);
    if (!prop2satVariable[key]) {
        prop2satVariable[key] = gen();
    }
    v = prop2satVariable[key];
    return v;
};

// the prop must be in dnf for this to work
var compileProp2Sat = function (prop,inverse,prop2satVariable,gen) {
    gen = gen || getAlphaGen();
    var ret = "";
    var key;
    var v;
    if (prop.type == NEGATE) {
        if (prop.body.length > 1 || prop.body[0].type!=PRED) {
            throw new Error();
        }
        inverse = !inverse;
        prop = prop.body[0];
    }
    if (prop.type == PRED) {
        v = getSatVariable(prop,prop2satVariable,gen);
        if (inverse) {
            return "[ " +v+" ]\n";
        }
        else {
            return "( " + v + " )\n";
        }
    }
    else if (prop.type == MULT) {
        if (!inverse) {
            prop.body.forEach(function (p) {
                if (p.type == NEGATE) {
                    if (p.body.length > 1) { throw new Error(); }
                    v = getSatVariable(p.body[0],prop2satVariable,gen);
                    ret += ("[ "  + v + " ]\n");
                }else if (p.type == PRED) {
                    v = getSatVariable(p,prop2satVariable,gen);
                    ret += ("( "+v+ " )\n");
                }
                else {
                    /*
                    console.log(p.type);
                    console.log(printProp(p));
                    */
                    throw new Error(); 
                }
            });
        }
        else {
            ret += "[";
            prop.body.forEach(function (p) {
                if (p.type == NEGATE) {
                    if (p.body.length > 1) { throw new Error(); }
                    v = getSatVariable(p.body[0],prop2satVariable,gen);
                    ret += "("+v+")"; 
                }
                else if (p.type == PRED) {
                    v = getSatVariable(p,prop2satVariable,gen);
                    ret += " "+v+" ";
                }
                else {
                    throw new Error();
                }
            });
            ret += "]\n";
        }
    }
    else {
        throw new Error();
    }
    return ret;
};

// axioms must be in dnf
var makeSimpleAxioms = function (axioms) {
    var newAxioms = [];
    var numGen = getNumGen();
    var map = {};
    axioms.forEach(function (ln) {
        var nln = {};
        nln.prefix = ln.prefix;
        nln.matrix = [];
        ln.matrix.forEach(function (prop) {
            var np = {type:prop.type};
            var num;
            if (prop.type == PRED) {
                num = numGen();
                np.name = num;
                np.body = [];
                map[num] = printProp(prop);
            }
            else if (prop.type == NEGATE) {
                num = numGen();
                if (prop.body.length > 1 || prop.body[0].type != PRED) {
                    throw new Error();
                }
                var bod = prop.body[0];
                var b = {type:PRED,body:[],name:num};
                var str = printProp(bod);
                np.body = [b];
                map[num] = str;
            }
            else if (prop.type == MULT) {
                var bod = [];
                prop.body.forEach(function (p) {
                    var npp = {type:p.type};
                    if (p.type == PRED) {
                        num = numGen();
                        npp.name = num;
                        npp.body = [];
                        map[num] = printProp(p);
                    }
                    else if (p.type == NEGATE) {
                        num = numGen();
                        if (p.body.length > 1 || p.body[0].type != PRED) {
                            throw new Error();
                        }
                        var pbod = p.body[0];
                        var b = {type:PRED,body:[],name:num};
                        var str = printProp(pbod);
                        npp.body = [b];
                        map[num] = str;
                    }
                    else {
                        throw new Error();
                    }
                    bod.push(npp);
                });
                np.body = bod;
            }
            else {
                throw new Error();
            }
            nln.matrix.push(np);
        });
        newAxioms.push(nln);
    });
    return {axioms:newAxioms,map:map};
};

var convolute = function (axioms,num) {
    var ln = product(axioms);
    var ret = [];
    var alphaGen = getAlphaGen();
    while (num > 0) {
      var cpy = copy(ln);
      cpy.prefix.forEach(function (pref) {
        inPlaceAlter(cpy,"."+alphaGen(),pref.val);
      });
      ret.push(cpy);
      num--;
    }
    return ret;
};

var copy = function (ln) {
  var nln = {};
  nln.prefix = [];
  nln.matrix = [];
  ln.prefix.forEach(function (pref) {
    var np = {};
    np.type = pref.type;
    np.val = pref.val;
    nln.prefix.push(np);
  });
  ln.matrix.forEach(function (prop) {
     nln.matrix.push(copyProp(prop));
  });
  return nln;
};

var copyProp = function (prop) {
  if (typeof prop == "string") {
    return prop;
  }
  var np =  {};
  np.type = prop.type;
  if (prop.name) {
    np.name = prop.name;
  }
  if (prop.body) {
    np.body = [];
    prop.body.forEach(function (p) {
      np.body.push(copyProp(p));
    });
  }
  return np;
};

var compile2fullSat = function (axioms,from2Map,index) {
    axioms.forEach(function (ln) {
        var k,v;
        for (k in from2Map) {
            v = from2Map[k];
            replace(ln,v,k);
        }
    });
    var simpleAxiomInfo = makeSimpleAxioms(axioms);
    var ln = product(simpleAxiomInfo.axioms);
    var sat = compile2sat(ln,index);
    var num2prop = simpleAxiomInfo.map;
    var prop2num = {};
    var prop2sat = sat.varTable;
    for (k in num2prop) {
        v = num2prop[k];
        if (!prop2num[v]) {
            prop2num[v] = [k];
        }
        else {
            prop2num[v].push(k);
        }
    }
    for (k in prop2num) {
        if (prop2num[k].length < 2) { continue; }
        v = prop2num[k];
        var  i = 0;
        var ii = v.length-1;
        for (;i<ii;i++) {
            var n1 = v[i];
            var n2 = v[i+1];
            var s1 = prop2sat[n1];
            var s2 = prop2sat[n2];
            sat.problem += "[("+s1+") "+s2+"]\n[("+s2+") "+s1+"]";
        }
    }
    var sat2prop = {};
    for (k in prop2sat) {
        var n = parseInt(k);
        var p = num2prop[n];
        v = prop2sat[k];
        sat2prop[v] = p;
    }
    if (sat.trueProp.type != MULT) {
        throw new Exception();
    }
    sat.trueProp.body.forEach(function (p) { 
         if (p.type == NEGATE) { 
            p.body[0].name = prop2sat[p.body[0].name];
        }
        else if (p.type == PRED) {
            p.name = prop2sat[p.name];
        }
        else {
            throw new Exception();
        }
    });
    sat.varTable = sat2prop;
    return sat;
};

// the matrix of the ln must be in dnf
var compile2sat = function (ln,index) {
    var matrix = ln.matrix;
    var newMatrix = removeContradictions(matrix);
    var trueProp = newMatrix[index];
    newMatrix.splice(index,1);
    var satProblem = '';
    var prop2satVariable = {};
    var gen = getAlphaGen();
    satProblem += compileProp2Sat(trueProp,false,prop2satVariable,gen);
    newMatrix.forEach(function (p) {
        satProblem += compileProp2Sat(p,true,prop2satVariable,gen);
        satProblem += "\n";
    });
    return {problem:satProblem,varTable:prop2satVariable,trueProp:trueProp};
};

var getLineTokens = function (linestr) {
    return makeTokens(tokenize(linestr));
};

var compilePrefix = function (tokens) {
    var ret = [];
    var token = tokens();
    if (token.type == COLON) {
        throw new Error();
    }
    var p;
    while (token.type != COLON) {
        p = {};   
        if (token.type == FORALL || token.type == THEREIS) {
            p.type = token.type;
            token = tokens();
            if (token.type != VAR) {
                throw new Error();
            }
            p.val = token.val;
            ret.push(p);
        }
        else {
            throw new Error();
        }
        token = tokens();
    }
    return ret;
};

var compileLineProp = function (token,tokens) {
    var props = [];
    var prop;
    var isMult = false;
    if (token.type == NEGATE) {
        token = tokens();
        if (token.type != VAR) {
            throw new Error();
        }
        var p = {type:NEGATE,body:[compileLinePred(token,tokens)]};
        props.push(p);
    }
    else if (token.type == VAR) {
        props.push(compileLinePred(token,tokens));
    }
    else {
        throw new Error();
    }
    token = tokens();
    if (token.type == MULT) {
        isMult = true;
        while (token.type == MULT) {
            token = tokens();
            if (token.type == NEGATE) {
                prop = {type:NEGATE,body:[compileLinePred(tokens(),tokens)]};
            }
            else if (token.type == VAR) {
                prop = compileLinePred(token,tokens);
            }
            else {
                throw new Error();
            }
            tokens = tokens();
            props.push(prop);
        }
    }
    if (!isMult && props.length > 1) {
        throw new Error();
    }
    if (isMult && prop.lenght < 2) {
        throw new Error();
    }
    if (isMult) {
        return {type:MULT,body:props};
    }
    return props[0];
};

var compileLinePred = function (token,tokens) {
    var prop = {type:PRED,name:token.val};
    var bod = [];
    prop.body = bod;
    token = tokens();
    if (token.type != LPAREN) {
        throw new Error();
    }
    token = tokens();
    while (token.type != RPAREN) {
       if (token.type != VAR) {
           throw new Error();
       }
       bod.push(token.val);
       token = tokens();
    }
    return prop;
};

var compileMatrix = function (tokens) { 
    var ret = [];
    var token = tokens();
    var prop = {};
    while (token != undefined) {
        if (token.type == VAR || token.type == NEGATE) {
            ret.push(compileLineProp(token,tokens));
            token = tokens();
        }
        else if (token.type == PLUS) {
            token = tokens();
        }
        else {
            throw new Error();
        }
    }
    return ret;
};

// compile lines in DNF
var compileLine = function (line) {
    var ln = {};
    var tokens = getLineTokens(line);
    ln.prefix = compilePrefix(tokens);
    ln.matrix = compileMatrix(tokens);
    return ln;
};

module.exports = {compileLine:compileLine,convolute:convolute,NEGATE:NEGATE,PRED:PRED,MULT:MULT,simplifyProp:simplifyProp,compile2sat:compile2fullSat,multiply:multiply,replaceVar:replace,println:println,removeClause:removeClause,product:product,compileAxioms:compileAxioms};
