var sat = require("../js/sat.js");
var getAlphaGen = function () {
    var c = 'a';
    return function () {
        var d = c;
        c = String.fromCharCode(c.charCodeAt(0) + 1);
        return d;
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
        return tokens.shift();
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
            while (isValidVarChar(str[i]) && i<ii) {
                name += str[i];
                i++;
            }
            i--;
            tokens.push({type:VAR,val:name});
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
        while (token && token.type != RPAREN ) {
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
        p += prop.name+"(";
        prop.body.forEach(function (v) {
            p+=v+" ";
        });
        p+=")";
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
                helper([subp.body[0]]);
                helper([subp.body[1]]);
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

// the prop must be in cnf for this to work
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
                    console.log(p.type);
                    console.log(printProp(p));
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

var addMoreConstraints = function (map,problem) {};

// the matrix of the ln must be in cnf
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
    addMoreConstraints(prop2satVariable,satProblem);
    return {problem:satProblem,varTable:prop2satVariable};
};


module.exports = {simplifyProp:simplifyProp,compile2sat:compile2sat,multiply:multiply,replaceVar:replace,println:println,removeClause:removeClause,product:product,compileAxioms:compileAxioms};
