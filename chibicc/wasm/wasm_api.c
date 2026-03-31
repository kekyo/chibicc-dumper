#include "../driver.h"

#include <stdlib.h>
#include <string.h>

void chibicc_use_wasm_host(void);

static char *last_output;
static char *last_error;

static void reset_last_result(void) {
  free(last_output);
  free(last_error);
  last_output = NULL;
  last_error = NULL;
}

/**
 * @brief Runs chibicc-dumper once inside the current WASM instance.
 * @param argc Number of argv entries.
 * @param argv Command-line style argument vector stored in WASM memory.
 * @return Exit status compatible with the native CLI.
 */
int chibicc_wasm_run(int argc, char **argv) {
  int status = 0;

  reset_last_result();
  chibicc_use_wasm_host();

  if (chibicc_driver_try_capture_main(argc, argv, &status, &last_output,
                                      &last_error))
    return status;

  return 1;
}

/**
 * @brief Returns the pointer to the last successful JSON output.
 * @return UTF-8 string pointer, or `NULL` when unavailable.
 */
char *chibicc_wasm_get_output_ptr(void) {
  return last_output;
}

/**
 * @brief Returns the byte length of the last successful JSON output.
 * @return Output length in bytes.
 */
int chibicc_wasm_get_output_len(void) {
  return last_output ? (int)strlen(last_output) : 0;
}

/**
 * @brief Returns the pointer to the last fatal diagnostic.
 * @return UTF-8 string pointer, or `NULL` when unavailable.
 */
char *chibicc_wasm_get_error_ptr(void) {
  return last_error;
}

/**
 * @brief Returns the byte length of the last fatal diagnostic.
 * @return Error length in bytes.
 */
int chibicc_wasm_get_error_len(void) {
  return last_error ? (int)strlen(last_error) : 0;
}
