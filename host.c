#include "chibicc.h"

static char *read_stream(FILE *fp) {
  size_t cap = 4096;
  size_t len = 0;
  char *buf = malloc(cap + 2);

  if (!buf)
    return NULL;

  for (;;) {
    if (len == cap) {
      cap *= 2;
      buf = realloc(buf, cap + 2);
      if (!buf)
        return NULL;
    }

    size_t n = fread(buf + len, 1, cap - len, fp);
    len += n;

    if (n == 0)
      break;
  }

  if (ferror(fp)) {
    free(buf);
    return NULL;
  }

  if (len == 0 || buf[len - 1] != '\n')
    buf[len++] = '\n';
  buf[len++] = '\0';
  return buf;
}

static bool native_file_exists(char *path) {
  struct stat st;
  return stat(path, &st) == 0;
}

static char *native_read_file(char *path) {
  FILE *fp;

  if (strcmp(path, "-") == 0) {
    fp = stdin;
  } else {
    fp = fopen(path, "r");
    if (!fp)
      return NULL;
  }

  char *buf = read_stream(fp);

  if (fp != stdin)
    fclose(fp);
  return buf;
}

static bool native_get_file_timestamp(char *path, time_t *result) {
  struct stat st;
  if (stat(path, &st) != 0)
    return false;
  *result = st.st_mtime;
  return true;
}

static char *native_resolve_executable_path(char *argv0) {
#ifdef __linux__
  char buf[4096];
  ssize_t len = readlink("/proc/self/exe", buf, sizeof(buf) - 1);
  if (len > 0) {
    buf[len] = '\0';
    return strdup(buf);
  }
#endif
  return strdup(argv0);
}

static void native_emit_warning(char *message) {
  fputs(message, stderr);
  if (!message[0] || message[strlen(message) - 1] != '\n')
    fputc('\n', stderr);
}

static ChibiccHost default_host = {
  .file_exists = native_file_exists,
  .read_file = native_read_file,
  .get_file_timestamp = native_get_file_timestamp,
  .resolve_executable_path = native_resolve_executable_path,
  .emit_warning = native_emit_warning,
};

static ChibiccHost *current_host = &default_host;
static ChibiccErrorContext *current_error_context;

void chibicc_use_default_host(void) {
  current_host = &default_host;
}

void chibicc_set_host(ChibiccHost *host) {
  current_host = host ? host : &default_host;
}

char *chibicc_read_file(char *path) {
  return current_host->read_file(path);
}

bool file_exists(char *path) {
  return current_host->file_exists(path);
}

bool chibicc_get_file_timestamp(char *path, time_t *result) {
  return current_host->get_file_timestamp(path, result);
}

char *chibicc_resolve_executable_path(char *argv0) {
  return current_host->resolve_executable_path(argv0);
}

void chibicc_begin_error_capture(ChibiccErrorContext *ctx) {
  ctx->message = NULL;
  current_error_context = ctx;
}

void chibicc_end_error_capture(void) {
  current_error_context = NULL;
}

noreturn void chibicc_fatal(char *message) {
  if (current_error_context) {
    current_error_context->message = message;
    longjmp(current_error_context->env, 1);
  }

  native_emit_warning(message);
  exit(1);
}

void chibicc_warn(char *message) {
  if (current_host->emit_warning)
    current_host->emit_warning(message);
}
