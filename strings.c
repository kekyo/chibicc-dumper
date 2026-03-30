#include "chibicc.h"

void strarray_push(StringArray *arr, char *s) {
  if (!arr->data) {
    arr->data = calloc(8, sizeof(char *));
    arr->capacity = 8;
  }

  if (arr->capacity == arr->len) {
    arr->data = realloc(arr->data, sizeof(char *) * arr->capacity * 2);
    arr->capacity *= 2;
    for (int i = arr->len; i < arr->capacity; i++)
      arr->data[i] = NULL;
  }

  arr->data[arr->len++] = s;
}

// Takes a printf-style format string and returns a formatted string.
char *vformat(char *fmt, va_list ap) {
  va_list ap2;
  va_copy(ap2, ap);
  int len = vsnprintf(NULL, 0, fmt, ap2);
  va_end(ap2);

  char *buf = calloc(1, len + 1);
  vsnprintf(buf, len + 1, fmt, ap);
  return buf;
}

char *format(char *fmt, ...) {
  va_list ap;
  va_start(ap, fmt);
  char *buf = vformat(fmt, ap);
  va_end(ap);
  return buf;
}

// Round up `n` to the nearest multiple of `align`.
int align_to(int n, int align) {
  return (n + align - 1) / align * align;
}
