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

struct Clause {
  int type;
  struct Clause *subClauses;
  // only for atomic clauses
  int varId;
  // link to next clause
  struct Clause *next;

}


struct ParsedSheet {
  struct VarContainer *vars;
  struct Clause *clauses;
  int clauseLen;
}

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

struct ParsedSheet *parse(struct ScannedSheet *ss) {
  struct Clause *clause = malloc(sizeof(struct Clause));
  int i =0;
  int ii = ss->tokenLen;
  for (;i<ii;i++) {



int main() {
  struct ScannedSheet *ss = tokenize();
  p(ss);
  warn("\n");
  warn("\n\nfinis\n");
 return 1;
}
