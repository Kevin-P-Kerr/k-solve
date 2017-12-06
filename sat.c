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

int getNextToken(struct Token *tokens, int i) {
  struct Token *token = &tokens[i];
  while (token->deleted) {
    i++;
    token = &tokens[i];
  }
  return i;
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
  vars->next = var;
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
      t->id = id;
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
  char *error = malloc(sizeof(char)*22);
  sprintf(error,"bad bad opening type %d\n",type);
  warn(error);
  free(error);
  return 0;
};

int isClauseStart(struct Token t) {
  return t.type == LPAREN || t.type == LBRAK;
}

int seekEndClause(struct ScannedSheet *ss, int i) {
  struct Token token = ss->tokens[i];
  struct Token *tokens = ss->tokens;
  int openingType = token.type;
  int closingType = getClosingType(openingType);
  i++;
  token = tokens[i];
  while (token.type != closingType) {
    if (token.deleted) { i++; token=tokens[i]; continue; }
    if (isClauseStart(token)) {
      i = seekEndClause(ss,i);
    }
    i++;
    token = tokens[i];
  }
  return i;
}

int deleteClause(int i, struct ScannedSheet *ss) {
  struct Token *token = &ss->tokens[i];
  token->deleted = 1;
  struct Token *tokens = ss->tokens;
  int openingType = token->type;
  int closingType = getClosingType(openingType);
  i = getNextToken(tokens,i);
  token = &tokens[i];
  while (token->type != closingType) {
    if (token->deleted) { i++; token=&tokens[i]; continue; }
    token->deleted = 1;
    if (isClauseStart(*token)) {
      i = seekEndClause(ss,i);
    }
    i++;
    token = &tokens[i];
  }
  token->deleted=1;
  return i;
}

int simplifyClause(int varId, struct ScannedSheet *ss, int i) {
  int beginning = i;
  int delete = 0;
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
      if (i<0) {
        deleteClause(beginning,ss);
        return -1;
      }
      if (!token->deleted) {
        clauseCount++;
      }
      else {
        for (;cp<i;cp++) {
          if ((!tokens[cp].deleted)) {
            if (isClauseStart(tokens[cp])) {
              clauseCount++;
              cp = seekEndClause(ss,cp);
            }
            else if (tokens[cp].type == VAR) {
              clauseCount+=2;
            }
          }
        } 
      }
    }
    else if (token->type == VAR) {
      if (token->id == varId) {
        token->deleted = 1;
        if (openingType == LPAREN) {
          deleteClause(beginning,ss);
          return -1;
        }
      }
      else {
        clauseCount+=2;
      }
    }
    i++;
    token = &tokens[i];
    while (token->deleted) {
      i++;
      token = &tokens[i];
    }
  }
  closeToken = token;
  if (clauseCount < 2) {
    openToken->deleted = 1;
    if (closeToken->deleted) {
      closeToken->deleted = 0;
    }
    else {
      closeToken->deleted =1;
    }
  }
  else {
    // sweep through and delete redundant bracket and parens
    int n = beginning+1;
    int nn = i-1;
    for(;n<nn;n++) {
      struct Token *token = &tokens[n];
      if (token->deleted) { continue; }
      if (token->type == openingType) {
        token->deleted= 1;
      }
      else if (token->type == closingType) {
        token->deleted = 1;
      }
      else if (isClauseStart(*token)) {
        n = seekEndClause(ss,n);
      }
    }
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

int solve(struct ScannedSheet *ss, int varId) {
  simplify(0,ss);
  p(ss);
}

int main() {
  struct ScannedSheet *ss = tokenize();
  p(ss);
  warn("\n");
  solve(ss,-1);
  warn("\n\nfinis\n");
 return 1;
}
