#include "chibicc.h"

typedef struct {
  Type **data;
  int len;
  int cap;
} TypeArray;

typedef struct {
  TypeArray types;
} DumpContext;

static int register_type(DumpContext *ctx, Type *ty);
static void gather_node(DumpContext *ctx, Node *node);
static void dump_node_json(FILE *out, DumpContext *ctx, Node *node);

static void typearray_push(TypeArray *arr, Type *ty) {
  if (arr->len == arr->cap) {
    arr->cap = arr->cap ? arr->cap * 2 : 16;
    arr->data = realloc(arr->data, sizeof(Type *) * arr->cap);
  }
  arr->data[arr->len++] = ty;
}

static void json_sep(FILE *out, bool *first) {
  if (!*first)
    fputc(',', out);
  *first = false;
}

static void json_key(FILE *out, bool *first, char *key) {
  json_sep(out, first);
  fprintf(out, "\"%s\":", key);
}

static void json_string_len(FILE *out, char *s, int len) {
  static char *hex = "0123456789abcdef";

  fputc('"', out);
  for (int i = 0; i < len; i++) {
    unsigned char c = s[i];
    switch (c) {
    case '"':
      fputs("\\\"", out);
      break;
    case '\\':
      fputs("\\\\", out);
      break;
    case '\b':
      fputs("\\b", out);
      break;
    case '\f':
      fputs("\\f", out);
      break;
    case '\n':
      fputs("\\n", out);
      break;
    case '\r':
      fputs("\\r", out);
      break;
    case '\t':
      fputs("\\t", out);
      break;
    default:
      if (c < 0x20) {
        fputs("\\u00", out);
        fputc(hex[c >> 4], out);
        fputc(hex[c & 15], out);
      } else {
        fputc(c, out);
      }
      break;
    }
  }
  fputc('"', out);
}

static void json_string(FILE *out, char *s) {
  if (!s) {
    fputs("null", out);
    return;
  }
  json_string_len(out, s, strlen(s));
}

static void json_bool(FILE *out, bool val) {
  fputs(val ? "true" : "false", out);
}

static void json_bytes(FILE *out, char *buf, int len) {
  if (!buf || len <= 0) {
    fputs("[]", out);
    return;
  }

  fputc('[', out);
  for (int i = 0; i < len; i++) {
    if (i)
      fputc(',', out);
    fprintf(out, "%u", (unsigned char)buf[i]);
  }
  fputc(']', out);
}

static char *token_file_name(Token *tok) {
  if (!tok)
    return NULL;
  if (tok->file && tok->file->display_name)
    return tok->file->display_name;
  if (tok->file && tok->file->name)
    return tok->file->name;
  return tok->filename;
}

static void dump_token_ref(FILE *out, Token *tok) {
  if (!tok) {
    fputs("null", out);
    return;
  }

  bool first = true;
  fputc('{', out);

  json_key(out, &first, "file");
  json_string(out, token_file_name(tok));

  json_key(out, &first, "line");
  fprintf(out, "%d", tok->line_no);

  json_key(out, &first, "lexeme");
  json_string_len(out, tok->loc, tok->len);

  fputc('}', out);
}

static char *token_kind_name(TokenKind kind) {
  switch (kind) {
  case TK_IDENT:
    return "TK_IDENT";
  case TK_PUNCT:
    return "TK_PUNCT";
  case TK_KEYWORD:
    return "TK_KEYWORD";
  case TK_STR:
    return "TK_STR";
  case TK_NUM:
    return "TK_NUM";
  case TK_PP_NUM:
    return "TK_PP_NUM";
  case TK_EOF:
    return "TK_EOF";
  }
  return "TK_UNKNOWN";
}

static char *node_kind_name(NodeKind kind) {
  switch (kind) {
  case ND_NULL_EXPR:
    return "ND_NULL_EXPR";
  case ND_ADD:
    return "ND_ADD";
  case ND_SUB:
    return "ND_SUB";
  case ND_MUL:
    return "ND_MUL";
  case ND_DIV:
    return "ND_DIV";
  case ND_NEG:
    return "ND_NEG";
  case ND_MOD:
    return "ND_MOD";
  case ND_BITAND:
    return "ND_BITAND";
  case ND_BITOR:
    return "ND_BITOR";
  case ND_BITXOR:
    return "ND_BITXOR";
  case ND_SHL:
    return "ND_SHL";
  case ND_SHR:
    return "ND_SHR";
  case ND_EQ:
    return "ND_EQ";
  case ND_NE:
    return "ND_NE";
  case ND_LT:
    return "ND_LT";
  case ND_LE:
    return "ND_LE";
  case ND_ASSIGN:
    return "ND_ASSIGN";
  case ND_COND:
    return "ND_COND";
  case ND_COMMA:
    return "ND_COMMA";
  case ND_MEMBER:
    return "ND_MEMBER";
  case ND_ADDR:
    return "ND_ADDR";
  case ND_DEREF:
    return "ND_DEREF";
  case ND_NOT:
    return "ND_NOT";
  case ND_BITNOT:
    return "ND_BITNOT";
  case ND_LOGAND:
    return "ND_LOGAND";
  case ND_LOGOR:
    return "ND_LOGOR";
  case ND_RETURN:
    return "ND_RETURN";
  case ND_IF:
    return "ND_IF";
  case ND_FOR:
    return "ND_FOR";
  case ND_DO:
    return "ND_DO";
  case ND_SWITCH:
    return "ND_SWITCH";
  case ND_CASE:
    return "ND_CASE";
  case ND_BLOCK:
    return "ND_BLOCK";
  case ND_GOTO:
    return "ND_GOTO";
  case ND_GOTO_EXPR:
    return "ND_GOTO_EXPR";
  case ND_LABEL:
    return "ND_LABEL";
  case ND_LABEL_VAL:
    return "ND_LABEL_VAL";
  case ND_FUNCALL:
    return "ND_FUNCALL";
  case ND_EXPR_STMT:
    return "ND_EXPR_STMT";
  case ND_STMT_EXPR:
    return "ND_STMT_EXPR";
  case ND_VAR:
    return "ND_VAR";
  case ND_VLA_PTR:
    return "ND_VLA_PTR";
  case ND_NUM:
    return "ND_NUM";
  case ND_CAST:
    return "ND_CAST";
  case ND_MEMZERO:
    return "ND_MEMZERO";
  case ND_ASM:
    return "ND_ASM";
  case ND_CAS:
    return "ND_CAS";
  case ND_EXCH:
    return "ND_EXCH";
  }
  return "ND_UNKNOWN";
}

static char *type_kind_name(TypeKind kind) {
  switch (kind) {
  case TY_VOID:
    return "TY_VOID";
  case TY_BOOL:
    return "TY_BOOL";
  case TY_CHAR:
    return "TY_CHAR";
  case TY_SHORT:
    return "TY_SHORT";
  case TY_INT:
    return "TY_INT";
  case TY_LONG:
    return "TY_LONG";
  case TY_FLOAT:
    return "TY_FLOAT";
  case TY_DOUBLE:
    return "TY_DOUBLE";
  case TY_LDOUBLE:
    return "TY_LDOUBLE";
  case TY_ENUM:
    return "TY_ENUM";
  case TY_PTR:
    return "TY_PTR";
  case TY_FUNC:
    return "TY_FUNC";
  case TY_ARRAY:
    return "TY_ARRAY";
  case TY_VLA:
    return "TY_VLA";
  case TY_STRUCT:
    return "TY_STRUCT";
  case TY_UNION:
    return "TY_UNION";
  }
  return "TY_UNKNOWN";
}

static int find_type_id(DumpContext *ctx, Type *ty) {
  if (!ty)
    return 0;

  for (int i = 0; i < ctx->types.len; i++)
    if (ctx->types.data[i] == ty)
      return i + 1;
  return 0;
}

static void gather_member(DumpContext *ctx, Member *mem) {
  for (; mem; mem = mem->next)
    register_type(ctx, mem->ty);
}

static int register_type(DumpContext *ctx, Type *ty) {
  if (!ty)
    return 0;

  int id = find_type_id(ctx, ty);
  if (id)
    return id;

  typearray_push(&ctx->types, ty);

  register_type(ctx, ty->origin);
  register_type(ctx, ty->base);
  register_type(ctx, ty->return_ty);

  for (Type *param = ty->params; param; param = param->next)
    register_type(ctx, param);

  gather_member(ctx, ty->members);
  gather_node(ctx, ty->vla_len);
  return ctx->types.len;
}

static void gather_obj(DumpContext *ctx, Obj *obj);

static void gather_obj_list(DumpContext *ctx, Obj *obj) {
  for (; obj; obj = obj->next)
    gather_obj(ctx, obj);
}

static void gather_node(DumpContext *ctx, Node *node) {
  if (!node)
    return;

  register_type(ctx, node->ty);
  register_type(ctx, node->func_ty);

  if (node->member)
    register_type(ctx, node->member->ty);

  if (node->var)
    gather_obj(ctx, node->var);
  if (node->ret_buffer)
    gather_obj(ctx, node->ret_buffer);
  if (node->atomic_addr)
    gather_obj(ctx, node->atomic_addr);

  gather_node(ctx, node->lhs);
  gather_node(ctx, node->rhs);
  gather_node(ctx, node->cond);
  gather_node(ctx, node->then);
  gather_node(ctx, node->els);
  gather_node(ctx, node->init);
  gather_node(ctx, node->inc);
  gather_node(ctx, node->default_case);
  gather_node(ctx, node->cas_addr);
  gather_node(ctx, node->cas_old);
  gather_node(ctx, node->cas_new);
  gather_node(ctx, node->atomic_expr);

  for (Node *n = node->body; n; n = n->next)
    gather_node(ctx, n);
  for (Node *n = node->args; n; n = n->next)
    gather_node(ctx, n);
}

static void gather_obj(DumpContext *ctx, Obj *obj) {
  if (!obj)
    return;

  register_type(ctx, obj->ty);
  gather_obj_list(ctx, obj->params);
  gather_obj_list(ctx, obj->locals);
  gather_obj(ctx, obj->va_area);
  gather_obj(ctx, obj->alloca_bottom);
  gather_node(ctx, obj->body);
}

static void gather_tokens(DumpContext *ctx, Token *tok) {
  for (; tok; tok = tok->next)
    register_type(ctx, tok->ty);
}

static void dump_type_ref(FILE *out, DumpContext *ctx, Type *ty) {
  int id = register_type(ctx, ty);
  if (!id) {
    fputs("null", out);
    return;
  }
  fprintf(out, "%d", id);
}

static void dump_var_ref_json(FILE *out, DumpContext *ctx, Obj *var) {
  if (!var) {
    fputs("null", out);
    return;
  }

  bool first = true;
  fputc('{', out);

  json_key(out, &first, "name");
  json_string(out, var->name);

  json_key(out, &first, "typeId");
  dump_type_ref(out, ctx, var->ty);

  json_key(out, &first, "isLocal");
  json_bool(out, var->is_local);

  json_key(out, &first, "isFunction");
  json_bool(out, var->is_function);

  json_key(out, &first, "isDefinition");
  json_bool(out, var->is_definition);

  json_key(out, &first, "isStatic");
  json_bool(out, var->is_static);

  json_key(out, &first, "isTentative");
  json_bool(out, var->is_tentative);

  json_key(out, &first, "isTls");
  json_bool(out, var->is_tls);

  fputc('}', out);
}

static void dump_member_json(FILE *out, DumpContext *ctx, Member *mem) {
  bool first = true;
  fputc('{', out);

  json_key(out, &first, "name");
  if (mem->name)
    json_string_len(out, mem->name->loc, mem->name->len);
  else
    fputs("null", out);

  json_key(out, &first, "typeId");
  dump_type_ref(out, ctx, mem->ty);

  json_key(out, &first, "offset");
  fprintf(out, "%d", mem->offset);

  json_key(out, &first, "align");
  fprintf(out, "%d", mem->align);

  json_key(out, &first, "index");
  fprintf(out, "%d", mem->idx);

  json_key(out, &first, "isBitfield");
  json_bool(out, mem->is_bitfield);

  json_key(out, &first, "bitOffset");
  fprintf(out, "%d", mem->bit_offset);

  json_key(out, &first, "bitWidth");
  fprintf(out, "%d", mem->bit_width);

  fputc('}', out);
}

static void dump_type_list_json(FILE *out, DumpContext *ctx, Type *ty) {
  fputc('[', out);
  bool first = true;
  for (; ty; ty = ty->next) {
    json_sep(out, &first);
    dump_type_ref(out, ctx, ty);
  }
  fputc(']', out);
}

static void dump_member_list_json(FILE *out, DumpContext *ctx, Member *mem) {
  fputc('[', out);
  bool first = true;
  for (; mem; mem = mem->next) {
    json_sep(out, &first);
    dump_member_json(out, ctx, mem);
  }
  fputc(']', out);
}

static void dump_type_json(FILE *out, DumpContext *ctx, Type *ty, int id) {
  bool first = true;
  fputc('{', out);

  json_key(out, &first, "id");
  fprintf(out, "%d", id);

  json_key(out, &first, "kind");
  json_string(out, type_kind_name(ty->kind));

  json_key(out, &first, "size");
  fprintf(out, "%d", ty->size);

  json_key(out, &first, "align");
  fprintf(out, "%d", ty->align);

  json_key(out, &first, "isUnsigned");
  json_bool(out, ty->is_unsigned);

  json_key(out, &first, "isAtomic");
  json_bool(out, ty->is_atomic);

  json_key(out, &first, "originTypeId");
  dump_type_ref(out, ctx, ty->origin);

  if (ty->base) {
    json_key(out, &first, "baseTypeId");
    dump_type_ref(out, ctx, ty->base);
  }

  if (ty->name) {
    json_key(out, &first, "name");
    json_string_len(out, ty->name->loc, ty->name->len);
  }

  if (ty->name_pos) {
    json_key(out, &first, "nameToken");
    dump_token_ref(out, ty->name_pos);
  }

  switch (ty->kind) {
  case TY_ARRAY:
    json_key(out, &first, "arrayLen");
    fprintf(out, "%d", ty->array_len);
    break;
  case TY_VLA:
    json_key(out, &first, "vlaLen");
    dump_node_json(out, ctx, ty->vla_len);
    break;
  case TY_FUNC:
    json_key(out, &first, "returnTypeId");
    dump_type_ref(out, ctx, ty->return_ty);

    json_key(out, &first, "paramTypeIds");
    dump_type_list_json(out, ctx, ty->params);

    json_key(out, &first, "isVariadic");
    json_bool(out, ty->is_variadic);
    break;
  case TY_STRUCT:
  case TY_UNION:
    json_key(out, &first, "members");
    dump_member_list_json(out, ctx, ty->members);

    json_key(out, &first, "isFlexible");
    json_bool(out, ty->is_flexible);

    json_key(out, &first, "isPacked");
    json_bool(out, ty->is_packed);
    break;
  default:
    break;
  }

  fputc('}', out);
}

static void dump_string_number(FILE *out, long double value) {
  char buf[128];
  snprintf(buf, sizeof(buf), "%.20Lg", value);
  json_string(out, buf);
}

static void dump_node_list_json(FILE *out, DumpContext *ctx, Node *node) {
  fputc('[', out);
  bool first = true;
  for (; node; node = node->next) {
    json_sep(out, &first);
    dump_node_json(out, ctx, node);
  }
  fputc(']', out);
}

static void dump_obj_list_json(FILE *out, DumpContext *ctx, Obj *obj, bool shallow);

static void dump_relocation_list_json(FILE *out, Relocation *rel) {
  fputc('[', out);
  bool first = true;
  for (; rel; rel = rel->next) {
    json_sep(out, &first);

    bool first_prop = true;
    fputc('{', out);

    json_key(out, &first_prop, "offset");
    fprintf(out, "%d", rel->offset);

    json_key(out, &first_prop, "label");
    if (rel->label && *rel->label)
      json_string(out, *rel->label);
    else
      fputs("null", out);

    json_key(out, &first_prop, "addend");
    fprintf(out, "%ld", rel->addend);

    fputc('}', out);
  }
  fputc(']', out);
}

static void dump_obj_json(FILE *out, DumpContext *ctx, Obj *obj, bool shallow) {
  bool first = true;
  fputc('{', out);

  json_key(out, &first, "name");
  json_string(out, obj->name);

  json_key(out, &first, "typeId");
  dump_type_ref(out, ctx, obj->ty);

  json_key(out, &first, "align");
  fprintf(out, "%d", obj->align);

  json_key(out, &first, "isLocal");
  json_bool(out, obj->is_local);

  json_key(out, &first, "isFunction");
  json_bool(out, obj->is_function);

  json_key(out, &first, "isDefinition");
  json_bool(out, obj->is_definition);

  json_key(out, &first, "isStatic");
  json_bool(out, obj->is_static);

  json_key(out, &first, "isTentative");
  json_bool(out, obj->is_tentative);

  json_key(out, &first, "isTls");
  json_bool(out, obj->is_tls);

  if (obj->tok) {
    json_key(out, &first, "token");
    dump_token_ref(out, obj->tok);
  }

  if (!shallow) {
    if (obj->is_function) {
      json_key(out, &first, "isInline");
      json_bool(out, obj->is_inline);

      json_key(out, &first, "isLive");
      json_bool(out, obj->is_live);

      json_key(out, &first, "isRoot");
      json_bool(out, obj->is_root);

      json_key(out, &first, "params");
      dump_obj_list_json(out, ctx, obj->params, true);

      json_key(out, &first, "locals");
      dump_obj_list_json(out, ctx, obj->locals, true);

      json_key(out, &first, "body");
      dump_node_json(out, ctx, obj->body);
    } else {
      if (obj->init_data) {
        int size = obj->ty ? obj->ty->size : 0;
        if (size < 0)
          size = 0;

        json_key(out, &first, "initDataBytes");
        json_bytes(out, obj->init_data, size);
      }

      if (obj->rel) {
        json_key(out, &first, "relocations");
        dump_relocation_list_json(out, obj->rel);
      }
    }
  }

  fputc('}', out);
}

static void dump_obj_list_json(FILE *out, DumpContext *ctx, Obj *obj, bool shallow) {
  fputc('[', out);
  bool first = true;
  for (; obj; obj = obj->next) {
    json_sep(out, &first);
    dump_obj_json(out, ctx, obj, shallow);
  }
  fputc(']', out);
}

static void dump_node_json(FILE *out, DumpContext *ctx, Node *node) {
  if (!node) {
    fputs("null", out);
    return;
  }

  bool first = true;
  fputc('{', out);

  json_key(out, &first, "kind");
  json_string(out, node_kind_name(node->kind));

  if (node->ty) {
    json_key(out, &first, "typeId");
    dump_type_ref(out, ctx, node->ty);
  }

  if (node->tok) {
    json_key(out, &first, "token");
    dump_token_ref(out, node->tok);
  }

  if (node->lhs) {
    json_key(out, &first, "lhs");
    dump_node_json(out, ctx, node->lhs);
  }

  if (node->rhs) {
    json_key(out, &first, "rhs");
    dump_node_json(out, ctx, node->rhs);
  }

  if (node->cond) {
    json_key(out, &first, "cond");
    dump_node_json(out, ctx, node->cond);
  }

  if (node->then) {
    json_key(out, &first, "then");
    dump_node_json(out, ctx, node->then);
  }

  if (node->els) {
    json_key(out, &first, "else");
    dump_node_json(out, ctx, node->els);
  }

  if (node->init) {
    json_key(out, &first, "init");
    dump_node_json(out, ctx, node->init);
  }

  if (node->inc) {
    json_key(out, &first, "inc");
    dump_node_json(out, ctx, node->inc);
  }

  if (node->body) {
    json_key(out, &first, "body");
    dump_node_list_json(out, ctx, node->body);
  }

  if (node->args) {
    json_key(out, &first, "args");
    dump_node_list_json(out, ctx, node->args);
  }

  if (node->var) {
    json_key(out, &first, "var");
    dump_var_ref_json(out, ctx, node->var);
  }

  if (node->member) {
    json_key(out, &first, "member");
    dump_member_json(out, ctx, node->member);
  }

  if (node->func_ty) {
    json_key(out, &first, "funcTypeId");
    dump_type_ref(out, ctx, node->func_ty);
  }

  if (node->pass_by_stack) {
    json_key(out, &first, "passByStack");
    json_bool(out, node->pass_by_stack);
  }

  if (node->ret_buffer) {
    json_key(out, &first, "retBuffer");
    dump_var_ref_json(out, ctx, node->ret_buffer);
  }

  if (node->label) {
    json_key(out, &first, "label");
    json_string(out, node->label);
  }

  if (node->unique_label) {
    json_key(out, &first, "uniqueLabel");
    json_string(out, node->unique_label);
  }

  if (node->brk_label) {
    json_key(out, &first, "breakLabel");
    json_string(out, node->brk_label);
  }

  if (node->cont_label) {
    json_key(out, &first, "continueLabel");
    json_string(out, node->cont_label);
  }

  if (node->kind == ND_CASE) {
    json_key(out, &first, "begin");
    fprintf(out, "%ld", node->begin);

    json_key(out, &first, "end");
    fprintf(out, "%ld", node->end);
  }

  if (node->kind == ND_NUM) {
    if (node->ty && is_flonum(node->ty)) {
      json_key(out, &first, "fvalue");
      dump_string_number(out, node->fval);
    } else {
      json_key(out, &first, "value");
      fprintf(out, "%ld", (long)node->val);
    }
  }

  if (node->asm_str) {
    json_key(out, &first, "asm");
    json_string(out, node->asm_str);
  }

  if (node->cas_addr) {
    json_key(out, &first, "casAddr");
    dump_node_json(out, ctx, node->cas_addr);
  }

  if (node->cas_old) {
    json_key(out, &first, "casOld");
    dump_node_json(out, ctx, node->cas_old);
  }

  if (node->cas_new) {
    json_key(out, &first, "casNew");
    dump_node_json(out, ctx, node->cas_new);
  }

  if (node->atomic_addr) {
    json_key(out, &first, "atomicAddr");
    dump_var_ref_json(out, ctx, node->atomic_addr);
  }

  if (node->atomic_expr) {
    json_key(out, &first, "atomicExpr");
    dump_node_json(out, ctx, node->atomic_expr);
  }

  fputc('}', out);
}

static void dump_types_json(FILE *out, DumpContext *ctx) {
  fputc('[', out);
  for (int i = 0; i < ctx->types.len; i++) {
    if (i)
      fputc(',', out);
    dump_type_json(out, ctx, ctx->types.data[i], i + 1);
  }
  fputc(']', out);
}

static void dump_token_json(FILE *out, DumpContext *ctx, Token *tok) {
  bool first = true;
  fputc('{', out);

  json_key(out, &first, "kind");
  json_string(out, token_kind_name(tok->kind));

  json_key(out, &first, "lexeme");
  json_string_len(out, tok->loc, tok->len);

  json_key(out, &first, "file");
  json_string(out, token_file_name(tok));

  json_key(out, &first, "line");
  fprintf(out, "%d", tok->line_no);

  json_key(out, &first, "atBol");
  json_bool(out, tok->at_bol);

  json_key(out, &first, "hasSpace");
  json_bool(out, tok->has_space);

  if (tok->ty) {
    json_key(out, &first, "typeId");
    dump_type_ref(out, ctx, tok->ty);
  }

  if (tok->kind == TK_NUM) {
    if (tok->ty && is_flonum(tok->ty)) {
      json_key(out, &first, "fvalue");
      dump_string_number(out, tok->fval);
    } else {
      json_key(out, &first, "value");
      fprintf(out, "%ld", (long)tok->val);
    }
  }

  if (tok->kind == TK_STR && tok->str) {
    int size = tok->ty ? tok->ty->size : 0;
    if (size < 0)
      size = 0;

    json_key(out, &first, "stringBytes");
    json_bytes(out, tok->str, size);
  }

  fputc('}', out);
}

static void dump_tokens_json(FILE *out, DumpContext *ctx, Token *tok) {
  fputc('[', out);
  bool first = true;
  for (; tok; tok = tok->next) {
    json_sep(out, &first);
    dump_token_json(out, ctx, tok);
  }
  fputc(']', out);
}

void dump_translation_unit_json(Token *tok, Obj *prog, bool dump_tokens,
                                bool dump_ast, FILE *out) {
  DumpContext ctx = {};

  if (dump_tokens)
    gather_tokens(&ctx, tok);
  if (dump_ast)
    gather_obj_list(&ctx, prog);

  bool first = true;
  fputc('{', out);

  json_key(out, &first, "types");
  dump_types_json(out, &ctx);

  if (dump_tokens) {
    json_key(out, &first, "tokens");
    dump_tokens_json(out, &ctx, tok);
  }

  if (dump_ast) {
    json_key(out, &first, "ast");
    fputs("{\"kind\":\"program\",\"globals\":", out);
    dump_obj_list_json(out, &ctx, prog, false);
    fputc('}', out);
  }

  fputs("}\n", out);
}
