#include "../chibicc.h"

#define WASM_IMPORT(name) __attribute__((import_module("env"), import_name(name)))

extern int chibicc_host_file_exists(char *path) WASM_IMPORT("chibicc_host_file_exists");
extern int chibicc_host_read_file_size(char *path) WASM_IMPORT("chibicc_host_read_file_size");
extern int chibicc_host_read_file(char *path, char *buffer, int capacity)
  WASM_IMPORT("chibicc_host_read_file");
extern int chibicc_host_get_file_timestamp(char *path)
  WASM_IMPORT("chibicc_host_get_file_timestamp");
extern int chibicc_host_write_file(char *path, char *buffer, int length)
  WASM_IMPORT("chibicc_host_write_file");
extern void chibicc_host_emit_warning(char *message)
  WASM_IMPORT("chibicc_host_emit_warning");

static bool wasm_file_exists(char *path) {
  return chibicc_host_file_exists(path) != 0;
}

static char *wasm_read_file(char *path) {
  int size = chibicc_host_read_file_size(path);
  if (size < 0)
    return NULL;

  char *buffer = calloc(1, size + 2);
  int nread = chibicc_host_read_file(path, buffer, size);
  if (nread < 0) {
    free(buffer);
    return NULL;
  }

  if (nread == 0 || buffer[nread - 1] != '\n')
    buffer[nread++] = '\n';
  buffer[nread++] = '\0';
  return buffer;
}

static bool wasm_get_file_timestamp(char *path, time_t *result) {
  int timestamp = chibicc_host_get_file_timestamp(path);
  if (timestamp < 0)
    return false;
  *result = timestamp;
  return true;
}

static bool wasm_write_file(char *path, char *buffer, size_t len) {
  return chibicc_host_write_file(path, buffer, (int)len) != 0;
}

static char *wasm_resolve_executable_path(char *argv0) {
  return strdup(argv0);
}

static void wasm_emit_warning(char *message) {
  chibicc_host_emit_warning(message);
}

static ChibiccHost wasm_host = {
  .file_exists = wasm_file_exists,
  .read_file = wasm_read_file,
  .write_file = wasm_write_file,
  .get_file_timestamp = wasm_get_file_timestamp,
  .resolve_executable_path = wasm_resolve_executable_path,
  .emit_warning = wasm_emit_warning,
};

void chibicc_use_wasm_host(void) {
  chibicc_set_host(&wasm_host);
}
