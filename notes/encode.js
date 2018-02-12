var READFLAG = false;
var PERSONAL = true;
var fs = require('fs');
var notes;
var key = new Buffer(fs.readFileSync("./key").toString()).toString("base64");

var encode = function (str, key) {
    var ce = "base64";
    if (str.length < key.length) {
        throw new Error();
    }
    var i = 0;
    key = new Buffer(key,"base64").toString();
    while (str.length > key.length) {
        key = key + key[i];
        i++;
    }
    key = new Buffer(key).toString(ce);
    // convert to buffer
    var buf = Buffer.from(str,ce);
    var keybuf = new Buffer(key,ce);
    var retbuf = Buffer.alloc(buf.length);
    var i = 0;
    var ii = buf.length;
    for (;i<ii;i++) {
        retbuf[i] =(buf[i]^keybuf[i]);
    }
    return retbuf.toString(ce);
};

var decode = function (encoded,key) {
    return encode(encoded,key);
};

var secretFile;
var notesFiles;

if (PERSONAL) {
  secretFile = "./private.txt";
  notesfile = "./presonal.notes";
}
else {
  secretFile = "./secret.txt";
  notesFile = "./notes.txt";
}

if (READFLAG) {
    notes = new Buffer(fs.readFileSync(secretFile),"base64").toString("base64");
    notes = new Buffer(decode(notes,key),"base64").toString("utf8");
    fs.writeFileSync(notesFile,notes);
}
else {
    notes = fs.readFileSync(notesFile).toString();
    notes = new Buffer(notes).toString("base64");
    notes = encode(notes,key);
    fs.writeFileSync(secretFile, new Buffer(notes,"base64"));
}

