#include <stdio.h>
#include <stdlib.h>
#define MAXTOKEN 2000
#define LPAREN 0
#define RPAREN 1
#define VAR 2
#define LBRAK 3
#define RBRAK 4
#define DEBUG 2
#define WARN 1
#define LEVEL 2

struct Token {
  int deleted;
  int type;
  
  // just for variable
  int id;
  struct Str* strValue;
};

struct Str {
  char *c;
  int len;
};

struct VarContainer {
  struct VarContainer *next;
  int id;
  struct Str* str;
};

struct ScannedSheet {
  struct VarContainer *vars;
  struct Token *tokens;
  int tokenLen;
};

void freeStr(struct Str* str) {
  free(str->c);
  free(str);
}

int strEquals(struct Str* a, struct Str *b) {
  int alen = a->len;
  int blen = b->len;
  if (alen!=blen) {
    return 0;
  }
  int i=0;
  for (;i<alen;i++) {
    if (a->c[i] != b->c[i]) {
      return 0;
    }
  }
  return 1;
}

void warn (char* warning) {
  if (LEVEL >= WARN) {
   fprintf(stderr,"%s\n",warning);
  }
}

void fp (char c) {
  fprintf(stderr,"%c",c);
}

void printStr(struct Str *str) {
  fprintf(stderr,"%s",str->c);
}

void p (struct ScannedSheet *ss) {
  int i,ii;
  ii = ss->tokenLen;
  struct Token *t = ss->tokens;
  for (i=0;i<ii;i++) {
    struct Token* tok = &t[i];
    if (tok->deleted) {
      continue;
    }
    if (tok->type == LPAREN) {
      fp('(');
    }
    else if (tok->type == RPAREN) {
      fp(')');
    }
    else if (tok->type == RBRAK) {
      fp(']');
    }
    else if (tok->type == LBRAK) {
      fp('[');
    }
    else if (tok->type == VAR) {
      if ((!t[i+1].deleted) && t[i+1].type==VAR) {
        int newlen = tok->strValue->len+1;
        char *c = malloc(sizeof(char)*newlen);
        sprintf(c,"%s ",tok->strValue->c);
        struct Str *str = malloc(sizeof(struct Str));
        str->len = newlen;
        str->c = c;
        printStr(str);
        freeStr(str);
      }
      else {
        printStr(tok->strValue);
      }
    }
  }
}

char killWhite(char c) {
  while (c == '\n' || c == ' ' || c == '\t') {
    c = getchar();
  }
  return c;
}

int isAlpha (char c) {
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
}

struct Str* makeStr(char c) {
  char *buf = malloc(sizeof(char)*100);
  int len =1;
  buf[0] = c;
  while (isAlpha(c=getchar())) {
    buf[len] =c;
    len++;
  }
  ungetc(c,stdin);
  struct Str * str = malloc(sizeof(struct Str));
  str->len = len;
  str->c = malloc(sizeof(char)*len);
  int i =0;
  for (;i<len;i++) {
    str->c[i] = buf[i];
  }
  free(buf);
  return str;
}

void append(int id, struct Str *str, struct VarContainer *vars) {
  if (vars->id <0) {
    vars->id = id;
    vars->str = str;
    vars->next = 0;
    return;
  }
  struct VarContainer *var = malloc(sizeof(struct VarContainer));
  var->id = id;
  var->str = str;
  var->next = 0;
  while (vars->next != 0) {
    vars = vars->next;
  }
  var->next = var;
}

int findVar(struct Str *str, struct VarContainer *vars) {
  if (vars->id < 0) {
    return -1;
  }
  if (strEquals(str,vars->str)) {
    return vars->id;
  }
  if (vars->next != 0) {
    return findVar(str,vars->next);
  }
  return -1;
}

struct ScannedSheet* tokenize() {
  char c;
  int i =0;
  struct Token* tokens = malloc(sizeof(struct Token)*MAXTOKEN);
  int varcount = 0;
  struct VarContainer *vars = malloc(sizeof(struct VarContainer));
  vars->id = -1;
  while ((c=getchar())!=EOF) {
    c = killWhite(c);
    if (c == EOF) { break; } // why?
    struct Token* t = &tokens[i];
    t->deleted = 0;
    if (c == '(') {
      t->type = LPAREN;
    }
    else if (c == ')') {
      t->type = RPAREN;
    }
    else if (c == '[') {
      t->type = LBRAK;
    }
    else if (c == ']') {
      t->type = RBRAK;
    }
    else if (isAlpha(c)) {
      t->type = VAR;
      t->strValue = makeStr(c);
      int id = findVar(t->strValue, vars);
      if (id<0) {
        t->id = varcount;
        append(t->id,t->strValue,vars);
        varcount++;
      }
    }
    i++;
  }
  struct ScannedSheet *sheet = malloc(sizeof(struct ScannedSheet));
  sheet->vars = vars;
  sheet->tokens = tokens;
  sheet->tokenLen = i;
  return sheet;
}

int getClosingType (int type) {
  if (type == LPAREN) {
    return RPAREN;
  }
  if (type == LBRAK) {
    return RBRAK;
  }
  warn("bad closing type");
  return 0;
};

int simplifyClause(int varId, struct ScannedSheet *ss, int i) {
  int beginning = i;
  struct Token* tokens = ss->tokens;
  struct Token* token = &tokens[i];
  struct Token* openToken = token;
  struct Token* closeToken;
  int closingType = getClosingType(token->type);
  int openingType = token->type;
  i++;
  token = &tokens[i];
  int clauseCount = 0;
  while (token->type != closingType) {
    if (token->deleted) {
      i++;
      token = &tokens[i];
      continue;
    }
    if (token->type == LPAREN || token->type == LBRAK) {
      int cp = i;
      i = simplifyClause(varId,ss,i);
      if (!token->deleted || (tokens[cp+1].type == openingType && !tokens[cp+1].deleted)) {
        clauseCount++;
      }
    }
    else if (token->type == VAR) {
      if (token->id == varId) {
        token->deleted = 1;
      }
      else {
        clauseCount+=2;
      }
    }
    i++;
    token = &tokens[i];
  }
  closeToken = token;
  if (clauseCount < 2) {
    openToken->deleted = 1;
    closeToken->deleted =1;
  }
  return i;
}

void simplify(int var, struct ScannedSheet *ss) {
  int i =0;
  int simplified = 0;
  int l = ss->tokenLen;
  struct Token *tokens = ss->tokens;
  for (;i<l;i++) {
    struct Token token = tokens[i];
    if (token.deleted) {
      continue;
    }
    if (token.type == LPAREN || token.type == LBRAK) {
      i = simplifyClause(var,ss,i);
    }
  }
}

//int solve (struct Token *tokens,int l) {
  //struct VarTable *v = getVariableOrder(tokens);
//}

int main() {
  struct ScannedSheet *ss = tokenize();
  p(ss);
  warn("\n");
  simplify(0,ss);
  p(ss);
  warn("\n");
  simplify(1,ss);
  p(ss);
  warn("\n");
  simplify(4,ss);
  p(ss);
  warn("end\n");
  // return solve(tokens);
 return 1;
}
