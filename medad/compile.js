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

var makeConnectionsMap = function (connections) {
    connections = connections.split('\t');
    var varGen = getAlphaGen();
    var map = {};
    map.inverse = {};
    connections.forEach(function (con) {
        con = con.split(' ');
        var v = varGen();
        var ant = con[0];
        var l = con[1];
        if (!map[ant]) {
            map[ant] = [];
        }
        if (!map[l]) {
            map[l] = [];
        }
        map[ant].push(v);
        map[l].push(v);
        map.inverse[v] = [ant,l];
    });
    return map;
};

var compile2line = function (src,map) {
    src = src.split('\n');
    var subGraphs = src[0];
    var connections = src[1];
    subGraphs = makeTokens(tokenize(subGraphs));
    var lineInternal = {};
    lineInternal.prefix = [];
    lineInternal.bool = [];
    connections = makeConnectionsMap(connections);
    var compileProp = function (tokens) {
        var token = tokens();
        var props = [];
        var nodesOnLevel = [];
        var varsOnLevel = [];
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
                nodesOnLevel.push(token.val);
                connections[token.val].forEach(function (con) {
                    varsOnLevel.push(con);
                });
            }
            props.push(prop);
            token = tokens();
        }
        varsOnLevel.forEach(function (val) {
            var inverse = connections.inverse[val];
            var a = inverse[0];
            var b = inverse[1];
            if (nodesOnLevel.indexOf(a) >= 0 && nodesOnLevel.indexOf(b) >= 0) {
                addQuant(lineInternal.prefix,THEREIS,val);
            }
            else {
                addQuant(lineInternal.prefix,FORALL,val);
            }
        });
        return props;
    };
    lineInternal.matrix = compileProp(subGraphs);
    return lineInternal;
};

var printProp = function (prop) {
    var p = "";
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

var addQuant = function (prefix,quant,val) {
    if (quantContains(prefix,val)) {
        return;
    }
    prefix.push({type:quant,val:val});
};
    

//var z = compile2viz("a b c ( d e f (f g ))\na d\te f\tc e")
//var map = {a:'f',g:'f'};
//var z = compile2viz("(a) b c ( d e f (g h ))\na d\ta g\te f\tc e",map)
var map = {};
map.a = 'ALX';
map.b = 'KILLS';
map.d = 'LOVES';
map.e = 'VICE';
var z = compile2viz("(a) b (c) \na b\tb c",map)
var z = compile2line("(a) b (d (e)) \na b\tb d\td e",map)
console.log(println(z));

