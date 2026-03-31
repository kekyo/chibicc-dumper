struct Forward;
typedef struct Forward ForwardAlias;

struct Forward {
  int value;
};

typedef int ValueAlias;

typedef struct Hidden {
  int hidden;
} Hidden;

union Box {
  int i;
};
typedef union Box BoxAlias;

enum Color {
  COLOR_RED,
};
typedef enum Color ColorAlias;

int main(void) {
  typedef long ValueAlias;
  struct LocalTag {
    int inner;
  };
  typedef struct LocalTag LocalTagAlias;
  ValueAlias count = 0;
  struct LocalTag value = {count};
  return value.inner;
}
