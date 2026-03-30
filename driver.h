#ifndef CHIBICC_DRIVER_H
#define CHIBICC_DRIVER_H

#include <stdbool.h>

/**
 * @brief Runs the native chibicc-dumper CLI driver.
 * @param argc Number of command-line arguments.
 * @param argv Command-line argument vector.
 * @return Process exit status.
 */
int chibicc_driver_main(int argc, char **argv);

/**
 * @brief Runs the CLI driver while capturing fatal compiler diagnostics.
 * @param argc Number of command-line arguments.
 * @param argv Command-line argument vector.
 * @param status Receives the exit status.
 * @param error_message Receives the fatal diagnostic on failure.
 * @return `true` on success, otherwise `false`.
 */
bool chibicc_driver_try_main(int argc, char **argv, int *status,
                             char **error_message);

#endif
