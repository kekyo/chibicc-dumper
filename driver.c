#include "chibicc.h"

StringArray include_paths;

static StringArray opt_include;
static bool opt_E;
static bool opt_M;
static bool opt_MD;
static bool opt_MMD;
static bool opt_MP;
static bool opt_dump_tokens;
static bool opt_dump_ast;
static char *opt_MF;
static char *opt_MT;
static char *opt_o;

static StringArray std_include_paths;
static StringArray input_paths;

char *base_file;
static char *output_file;
static bool capture_stdout;
static char *captured_stdout;
static size_t captured_stdout_len;
static FILE *captured_stdout_file;
static char *captured_host_output_path;
static char *captured_host_output;
static size_t captured_host_output_len;
static FILE *captured_host_output_file;

static void usage(int status) {
  fprintf(stderr,
          "chibicc-dumper [--dump-tokens] [--dump-ast] [ -E ] [ -M | -MD ] "
          "[ -o <path> ] <file>\n");
  exit(status);
}

static bool take_arg(char *arg) {
  char *x[] = {
    "-o", "-I", "-idirafter", "-include", "-x", "-MF", "-MT",
    "-MQ", "-D", "-U",
  };

  for (int i = 0; i < sizeof(x) / sizeof(*x); i++)
    if (!strcmp(arg, x[i]))
      return true;
  return false;
}

static char *default_multiarch_include_path(void) {
#if defined(__x86_64__)
  return "/usr/include/x86_64-linux-gnu";
#elif defined(__i386__)
  return "/usr/include/i386-linux-gnu";
#elif defined(__aarch64__)
  return "/usr/include/aarch64-linux-gnu";
#elif defined(__arm__)
  return "/usr/include/arm-linux-gnueabihf";
#elif defined(__riscv) && __riscv_xlen == 64
  return "/usr/include/riscv64-linux-gnu";
#else
  return NULL;
#endif
}

static void add_default_include_paths(char *argv0) {
  char *self_path = chibicc_resolve_executable_path(argv0);
  char *multiarch_include = default_multiarch_include_path();

  // Use the real executable path so packaged symlinks still resolve the
  // adjacent builtin header directory correctly.
  strarray_push(&include_paths, format("%s/include", dirname(self_path)));

  // Add standard include paths.
  strarray_push(&include_paths, "/usr/local/include");
  if (multiarch_include)
    strarray_push(&include_paths, multiarch_include);
  strarray_push(&include_paths, "/usr/include");

  // Keep a copy of the standard include paths for -MMD option.
  for (int i = 0; i < include_paths.len; i++)
    strarray_push(&std_include_paths, include_paths.data[i]);
}

static void define(char *str) {
  char *eq = strchr(str, '=');
  if (eq)
    define_macro(strndup(str, eq - str), eq + 1);
  else
    define_macro(str, "1");
}

static void validate_opt_x(char *s) {
  if (!strcmp(s, "c"))
    return;
  if (!strcmp(s, "none"))
    return;
  error("<command line>: unknown argument for -x: %s", s);
}

static char *quote_makefile(char *s) {
  char *buf = calloc(1, strlen(s) * 2 + 1);

  for (int i = 0, j = 0; s[i]; i++) {
    switch (s[i]) {
    case '$':
      buf[j++] = '$';
      buf[j++] = '$';
      break;
    case '#':
      buf[j++] = '\\';
      buf[j++] = '#';
      break;
    case ' ':
    case '\t':
      for (int k = i - 1; k >= 0 && s[k] == '\\'; k--)
        buf[j++] = '\\';
      buf[j++] = '\\';
      buf[j++] = s[i];
      break;
    default:
      buf[j++] = s[i];
      break;
    }
  }
  return buf;
}

static void parse_args(int argc, char **argv) {
  for (int i = 1; i < argc; i++)
    if (take_arg(argv[i]))
      if (!argv[++i])
        usage(1);

  StringArray idirafter = {};

  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--dump-tokens")) {
      opt_dump_tokens = true;
      continue;
    }

    if (!strcmp(argv[i], "--dump-ast")) {
      opt_dump_ast = true;
      continue;
    }

    if (!strcmp(argv[i], "--help"))
      usage(0);

    if (!strcmp(argv[i], "-o")) {
      opt_o = argv[++i];
      continue;
    }

    if (!strncmp(argv[i], "-o", 2)) {
      opt_o = argv[i] + 2;
      continue;
    }

    if (!strcmp(argv[i], "-E")) {
      opt_E = true;
      continue;
    }

    if (!strncmp(argv[i], "-I", 2)) {
      strarray_push(&include_paths, argv[i] + 2);
      continue;
    }

    if (!strcmp(argv[i], "-D")) {
      define(argv[++i]);
      continue;
    }

    if (!strncmp(argv[i], "-D", 2)) {
      define(argv[i] + 2);
      continue;
    }

    if (!strcmp(argv[i], "-U")) {
      undef_macro(argv[++i]);
      continue;
    }

    if (!strncmp(argv[i], "-U", 2)) {
      undef_macro(argv[i] + 2);
      continue;
    }

    if (!strcmp(argv[i], "-include")) {
      strarray_push(&opt_include, argv[++i]);
      continue;
    }

    if (!strcmp(argv[i], "-x")) {
      validate_opt_x(argv[++i]);
      continue;
    }

    if (!strncmp(argv[i], "-x", 2)) {
      validate_opt_x(argv[i] + 2);
      continue;
    }

    if (!strcmp(argv[i], "-M")) {
      opt_M = true;
      continue;
    }

    if (!strcmp(argv[i], "-MF")) {
      opt_MF = argv[++i];
      continue;
    }

    if (!strcmp(argv[i], "-MP")) {
      opt_MP = true;
      continue;
    }

    if (!strcmp(argv[i], "-MT")) {
      if (opt_MT == NULL)
        opt_MT = argv[++i];
      else
        opt_MT = format("%s %s", opt_MT, argv[++i]);
      continue;
    }

    if (!strcmp(argv[i], "-MQ")) {
      if (opt_MT == NULL)
        opt_MT = quote_makefile(argv[++i]);
      else
        opt_MT = format("%s %s", opt_MT, quote_makefile(argv[++i]));
      continue;
    }

    if (!strcmp(argv[i], "-MD")) {
      opt_MD = true;
      continue;
    }

    if (!strcmp(argv[i], "-MMD")) {
      opt_MD = opt_MMD = true;
      continue;
    }

    if (!strcmp(argv[i], "-idirafter")) {
      strarray_push(&idirafter, argv[++i]);
      continue;
    }

    if (!strcmp(argv[i], "-hashmap-test")) {
      hashmap_test();
      exit(0);
    }

    // These options are accepted to keep test fixtures and common
    // compiler-style invocations usable, but they no longer change
    // behavior in this phase1/2-only tool.
    if (!strncmp(argv[i], "-O", 2) ||
        !strncmp(argv[i], "-W", 2) ||
        !strncmp(argv[i], "-g", 2) ||
        !strncmp(argv[i], "-std=", 5) ||
        !strcmp(argv[i], "-ffreestanding") ||
        !strcmp(argv[i], "-fno-builtin") ||
        !strcmp(argv[i], "-fno-omit-frame-pointer") ||
        !strcmp(argv[i], "-fno-stack-protector") ||
        !strcmp(argv[i], "-fno-strict-aliasing") ||
        !strcmp(argv[i], "-m64") ||
        !strcmp(argv[i], "-mno-red-zone") ||
        !strcmp(argv[i], "-w"))
      continue;

    if (argv[i][0] == '-' && argv[i][1] != '\0')
      error("unknown argument: %s", argv[i]);

    strarray_push(&input_paths, argv[i]);
  }

  for (int i = 0; i < idirafter.len; i++)
    strarray_push(&include_paths, idirafter.data[i]);

  if (input_paths.len == 0)
    error("no input files");

  if (input_paths.len > 1)
    error("multiple input files are not supported");

  if (!opt_E && !opt_M && !opt_MD && !opt_dump_tokens && !opt_dump_ast)
    error("no output mode specified; use -E, -M, --dump-tokens or --dump-ast");
}

static FILE *open_file(char *path) {
  if ((!path || strcmp(path, "-") == 0) && capture_stdout) {
    captured_stdout_file = open_memstream(&captured_stdout, &captured_stdout_len);
    if (!captured_stdout_file)
      error("cannot open output stream: %s", strerror(errno));
    return captured_stdout_file;
  }

  if (!path || strcmp(path, "-") == 0)
    return stdout;

  if (capture_stdout) {
    captured_host_output_path = strdup(path);
    captured_host_output = NULL;
    captured_host_output_len = 0;
    captured_host_output_file =
      open_memstream(&captured_host_output, &captured_host_output_len);
    if (!captured_host_output_file)
      error("cannot open output file: %s: %s", path, strerror(errno));
    return captured_host_output_file;
  }

  FILE *out = fopen(path, "w");
  if (!out)
    error("cannot open output file: %s: %s", path, strerror(errno));
  return out;
}

static void discard_output_captures(void) {
  if (captured_stdout_file) {
    fclose(captured_stdout_file);
    captured_stdout_file = NULL;
  }
  free(captured_stdout);
  captured_stdout = NULL;
  captured_stdout_len = 0;

  if (captured_host_output_file) {
    fclose(captured_host_output_file);
    captured_host_output_file = NULL;
  }
  free(captured_host_output_path);
  captured_host_output_path = NULL;
  free(captured_host_output);
  captured_host_output = NULL;
  captured_host_output_len = 0;
}

static void close_file(FILE *out) {
  if (out == stdout)
    return;

  fclose(out);
  if (out == captured_stdout_file) {
    captured_stdout_file = NULL;
    return;
  }

  if (out == captured_host_output_file) {
    char *path = captured_host_output_path;
    char *buffer = captured_host_output ? captured_host_output : strdup("");
    size_t len = captured_host_output ? captured_host_output_len : 0;

    captured_host_output_file = NULL;
    captured_host_output_path = NULL;
    captured_host_output = NULL;
    captured_host_output_len = 0;

    if (!chibicc_write_file(path, buffer, len))
      error("cannot write output file: %s", path);

    free(path);
    free(buffer);
  }
}

static char *replace_extn(char *tmpl, char *extn) {
  char *filename = basename(strdup(tmpl));
  char *dot = strrchr(filename, '.');
  if (dot)
    *dot = '\0';
  return format("%s%s", filename, extn);
}

// Print tokens to stdout. Used for -E.
static void print_tokens(Token *tok) {
  FILE *out = open_file(output_file ? output_file : "-");

  int line = 1;
  for (; tok->kind != TK_EOF; tok = tok->next) {
    if (line > 1 && tok->at_bol)
      fprintf(out, "\n");
    if (tok->has_space && !tok->at_bol)
      fprintf(out, " ");
    fprintf(out, "%.*s", tok->len, tok->loc);
    line++;
  }
  fprintf(out, "\n");
  close_file(out);
}

static bool in_std_include_path(char *path) {
  for (int i = 0; i < std_include_paths.len; i++) {
    char *dir = std_include_paths.data[i];
    int len = strlen(dir);
    if (strncmp(dir, path, len) == 0 && path[len] == '/')
      return true;
  }
  return false;
}

// If -M options are given, write a list of input files in make-readable
// format. Since code generation is removed, -MD behaves as a dependency-only
// mode.
static void print_dependencies(void) {
  char *path;
  if (opt_MF)
    path = opt_MF;
  else if (opt_MD)
    path = replace_extn(opt_o ? opt_o : base_file, ".d");
  else if (opt_o)
    path = opt_o;
  else
    path = "-";

  FILE *out = open_file(path);
  if (opt_MT)
    fprintf(out, "%s:", opt_MT);
  else
    fprintf(out, "%s:", quote_makefile(replace_extn(base_file, ".o")));

  File **files = get_input_files();

  for (int i = 0; files[i]; i++) {
    if (opt_MMD && in_std_include_path(files[i]->name))
      continue;
    fprintf(out, " \\\n  %s", files[i]->name);
  }

  fprintf(out, "\n\n");

  if (opt_MP) {
    for (int i = 1; files[i]; i++) {
      if (opt_MMD && in_std_include_path(files[i]->name))
        continue;
      fprintf(out, "%s:\n\n", quote_makefile(files[i]->name));
    }
  }

  close_file(out);
}

static Token *must_tokenize_file(char *path) {
  Token *tok = tokenize_file(path);
  if (!tok)
    error("%s: %s", path, strerror(errno));
  return tok;
}

static Token *append_tokens(Token *tok1, Token *tok2) {
  if (!tok1 || tok1->kind == TK_EOF)
    return tok2;

  Token *t = tok1;
  while (t->next->kind != TK_EOF)
    t = t->next;
  t->next = tok2;
  return tok1;
}

static Token *build_input_tokens(void) {
  Token *tok = NULL;

  for (int i = 0; i < opt_include.len; i++) {
    char *incl = opt_include.data[i];

    char *path;
    if (file_exists(incl)) {
      path = incl;
    } else {
      path = search_include_paths(incl);
      if (!path)
        error("-include: %s: %s", incl, strerror(errno));
    }

    tok = append_tokens(tok, must_tokenize_file(path));
  }

  return append_tokens(tok, must_tokenize_file(base_file));
}

static void cc1(void) {
  Token *raw_tok = NULL;
  Token *pp_tok = NULL;

  if (opt_dump_tokens)
    raw_tok = build_input_tokens();

  if (opt_E || opt_M || opt_MD || opt_dump_ast) {
    pp_tok = build_input_tokens();
    pp_tok = preprocess(pp_tok);
  }

  if (opt_M || opt_MD) {
    print_dependencies();
    if (opt_M || (!opt_E && !opt_dump_tokens && !opt_dump_ast))
      return;
  }

  if (opt_E) {
    print_tokens(pp_tok);
    return;
  }

  if (opt_dump_tokens || opt_dump_ast) {
    Obj *prog = NULL;
    if (opt_dump_ast)
      prog = parse(pp_tok);

    FILE *out = open_file(output_file ? output_file : "-");
    dump_translation_unit_json(raw_tok, prog, opt_dump_tokens, opt_dump_ast, out);
    close_file(out);
    return;
  }

  unreachable();
}

int chibicc_driver_main(int argc, char **argv) {
  init_macros();
  parse_args(argc, argv);
  add_default_include_paths(argv[0]);

  base_file = input_paths.data[0];
  output_file = opt_o;

  cc1();
  return 0;
}

bool chibicc_driver_try_capture_main(int argc, char **argv, int *status,
                                     char **output, char **error_message) {
  ChibiccErrorContext ctx;
  capture_stdout = true;
  captured_stdout = NULL;
  captured_stdout_len = 0;
  captured_stdout_file = NULL;
  captured_host_output_path = NULL;
  captured_host_output = NULL;
  captured_host_output_len = 0;
  captured_host_output_file = NULL;
  chibicc_begin_error_capture(&ctx);

  if (setjmp(ctx.env) == 0) {
    *status = chibicc_driver_main(argc, argv);
    if (captured_stdout_file)
      close_file(captured_stdout_file);
    *output = captured_stdout ? captured_stdout : strdup("");
    *error_message = NULL;
    chibicc_end_error_capture();
    capture_stdout = false;
    return true;
  }

  discard_output_captures();
  *status = 1;
  *output = NULL;
  *error_message = ctx.message;
  chibicc_end_error_capture();
  capture_stdout = false;
  return false;
}

bool chibicc_driver_try_main(int argc, char **argv, int *status,
                             char **error_message) {
  char *output;
  bool ok = chibicc_driver_try_capture_main(argc, argv, status, &output,
                                            error_message);
  free(output);
  return ok;
}
