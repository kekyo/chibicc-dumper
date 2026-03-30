# chibicc-dumper

A JSON dumper tool derived from chibicc that can output C language tokens and ASTs.

---

> Please note that this English version of the document was machine-translated and then partially edited, so it may contain inaccuracies.
> We welcome pull requests to correct any errors in the text.

## What is this?

For developers implementing FFI bridges, the implementation process is monotonous yet requires significant effort to fine-tune.
Implementing this part forces developers to choose between 3 approaches:

- "Outputting metadata from the target language system and using it to generate C source code for the glue,"
- Or "Parsing the C source code in some crude way and generating the glue code from that."
- Alternatively, they might give up on both and resort to the even more tedious task of outputting both from "Something abstract like IDL."

While it is impossible to fully automate all of this work, what if we could easily obtain token sequences or AST information from the C source code?
It might be possible to automatically generate bridge code from such information.
This means we can treat the C source code as a primary source of metadata—something we had previously given up on.

And this tool is designed to make that a reality.
It is a compact tool created by removing the code generator from the chibicc source code and modifying it to output this information as JSON.
It dumps the output of the tokenizer and parser as JSON.

For example, given this minimal translation unit (`sample.c`):

```c
int x;
```

Running `chibicc-dumper --dump-tokens --dump-ast sample.c` produces:

```json
{
  "types": [
    {
      "id": 1,
      "kind": "TY_INT",
      "size": 4,
      "align": 4,
      "isUnsigned": false,
      "isAtomic": false,
      "originTypeId": null,
      "name": "x",
      "nameToken": {
        "file": "sample.c",
        "line": 1,
        "lexeme": "x"
      }
    }
  ],
  "tokens": [
    {
      "kind": "TK_IDENT",
      "lexeme": "int",
      "file": "sample.c",
      "line": 1,
      "atBol": true,
      "hasSpace": false
    },
    {
      "kind": "TK_IDENT",
      "lexeme": "x",
      "file": "sample.c",
      "line": 1,
      "atBol": false,
      "hasSpace": true
    },
    {
      "kind": "TK_PUNCT",
      "lexeme": ";",
      "file": "sample.c",
      "line": 1,
      "atBol": false,
      "hasSpace": false
    },
    {
      "kind": "TK_EOF",
      "lexeme": "",
      "file": "sample.c",
      "line": 2,
      "atBol": true,
      "hasSpace": false
    }
  ],
  "ast": {
    "kind": "program",
    "globals": [
      {
        "name": "x",
        "typeId": 1,
        "align": 4,
        "isLocal": false,
        "isFunction": false,
        "isDefinition": true,
        "isStatic": false,
        "isTentative": true,
        "isTls": false
      }
    ]
  }
}
```

It might also be useful simply as an aid to learning chibicc, helping you analyze what kinds of token sequences and ASTs are generated.

### Clang can generate an AST

However, it has been [officially stated that this output is not stable.](https://clang.llvm.org/doxygen/JSONNodeDumper_8h_source.html)
On the other hand, chibicc is sufficiently stable, and neither its tokens nor its AST are likely to change.

---

## Install

You can install it on your system using the [pre-built packages](https://github.com/kekyo/chibicc-dumper/releases),

- Debian trixie, bookworm: amd64, i686, arm64, armv7l (32-bit), and riscv64
- Ubuntu 24.04, 22.04: amd64 and arm64

Or, build the tool with `make`:

```sh
make
```

The executable is generated as `./chibicc-dumper`.

## Usage

### Command line

```text
chibicc-dumper [--dump-tokens] [--dump-ast] [ -E ] [ -M | -MD ] [ -o <path> ] <file>
```

The dumper accepts a single C translation unit as input.

- `--dump-tokens`
  Dumps the raw phase 1 tokenizer output before preprocessing.
- `--dump-ast`
  Dumps the phase 2 parser output after preprocessing.
- `--dump-tokens --dump-ast`
  Emits one JSON document containing both views.
- `-o <path>`
  Writes the JSON output to a file instead of standard output.

Preprocessor-oriented options such as `-I`, `-idirafter`, `-include`, `-D`, `-U`,
`-x c|none`, `-E`, and `-M*` are still supported because they are useful for
front-end analysis.

### Examples

Dump raw tokens to standard output:

```sh
chibicc-dumper --dump-tokens sample.c
```

Dump the parsed AST to a file:

```sh
chibicc-dumper --dump-ast -o sample.ast.json sample.c
```

Dump both tokens and AST in one JSON document:

```sh
chibicc-dumper --dump-tokens --dump-ast -o sample.full.json sample.c
```

### JSON structure

The output is always a single JSON object. The top-level shape is:

```json
{
  "types": [...],
  "tokens": [...],
  "ast": {
    "kind": "program",
    "globals": [...]
  }
}
```

`types` is always present. `tokens` is present only when `--dump-tokens` is
requested, and `ast` is present only when `--dump-ast` is requested.

Token entries contain lexical information such as token kind, source lexeme,
source file, line number, beginning-of-line state, and whitespace information.
For example:

```json
{
  "types": [],
  "tokens": [
    {
      "kind": "TK_IDENT",
      "lexeme": "int",
      "file": "sample.c",
      "line": 1,
      "atBol": true,
      "hasSpace": false
    },
    {
      "kind": "TK_PP_NUM",
      "lexeme": "42",
      "file": "sample.c",
      "line": 1,
      "atBol": false,
      "hasSpace": true
    }
  ]
}
```

AST output contains normalized type references through fields such as
`typeId`, `baseTypeId`, and `returnTypeId`. Function definitions appear under
`ast.globals`, and statement/expression nodes are nested under each function's
`body`. For example:

```json
{
  "types": [
    {
      "id": 4,
      "kind": "TY_FUNC",
      "name": "main",
      "returnTypeId": 5,
      "paramTypeIds": [],
      "isVariadic": false
    },
    {
      "id": 5,
      "kind": "TY_INT",
      "size": 4,
      "align": 4,
      "isUnsigned": false,
      "isAtomic": false,
      "originTypeId": null
    }
  ],
  "ast": {
    "kind": "program",
    "globals": [
      {
        "name": "main",
        "typeId": 4,
        "isFunction": true,
        "body": {
          "kind": "ND_BLOCK",
          "body": [
            {
              "kind": "ND_RETURN",
              "lhs": {
                "kind": "ND_NUM",
                "typeId": 5,
                "value": 42
              }
            }
          ]
        }
      }
    ]
  }
}
```

### Token variation

| Token        | Details                                                           |
| :----------- | :---------------------------------------------------------------- |
| `TK_IDENT`   | Identifier token emitted by the tokenizer.                        |
| `TK_PUNCT`   | Punctuation or operator token such as `(`, `)`, `+`, or `->`.     |
| `TK_KEYWORD` | Reserved language keyword after keyword classification.           |
| `TK_STR`     | String literal token with decoded string bytes and a string type. |
| `TK_NUM`     | Numeric token after semantic number parsing.                      |
| `TK_PP_NUM`  | Preprocessor-number token before final numeric interpretation.    |
| `TK_EOF`     | End-of-file sentinel token appended to every token stream.        |

### AST node variation

| Type         | Details                                                        |
| :----------- | :------------------------------------------------------------- |
| `TY_VOID`    | The `void` type.                                               |
| `TY_BOOL`    | The `_Bool` type.                                              |
| `TY_CHAR`    | The `char` type.                                               |
| `TY_SHORT`   | The `short` type.                                              |
| `TY_INT`     | The `int` type.                                                |
| `TY_LONG`    | The `long` type.                                               |
| `TY_FLOAT`   | The `float` type.                                              |
| `TY_DOUBLE`  | The `double` type.                                             |
| `TY_LDOUBLE` | The `long double` type.                                        |
| `TY_ENUM`    | An enum type.                                                  |
| `TY_PTR`     | A pointer type with `baseTypeId` pointing to the pointee type. |
| `TY_FUNC`    | A function type with `returnTypeId` and `paramTypeIds`.        |
| `TY_ARRAY`   | A fixed-size array type with `baseTypeId` and `arrayLen`.      |
| `TY_VLA`     | A variable-length array type.                                  |
| `TY_STRUCT`  | A struct type, including member layout metadata.               |
| `TY_UNION`   | A union type, including member layout metadata.                |

| Node           | Details                                                        |
| :------------- | :------------------------------------------------------------- |
| `ND_NULL_EXPR` | A no-op expression placeholder.                                |
| `ND_ADD`       | Addition expression.                                           |
| `ND_SUB`       | Subtraction expression.                                        |
| `ND_MUL`       | Multiplication expression.                                     |
| `ND_DIV`       | Division expression.                                           |
| `ND_NEG`       | Unary minus expression.                                        |
| `ND_MOD`       | Remainder expression.                                          |
| `ND_BITAND`    | Bitwise AND expression.                                        |
| `ND_BITOR`     | Bitwise OR expression.                                         |
| `ND_BITXOR`    | Bitwise XOR expression.                                        |
| `ND_SHL`       | Left-shift expression.                                         |
| `ND_SHR`       | Right-shift expression.                                        |
| `ND_EQ`        | Equality comparison expression.                                |
| `ND_NE`        | Inequality comparison expression.                              |
| `ND_LT`        | Less-than comparison expression.                               |
| `ND_LE`        | Less-than-or-equal comparison expression.                      |
| `ND_ASSIGN`    | Assignment expression.                                         |
| `ND_COND`      | Ternary conditional (`?:`) expression.                         |
| `ND_COMMA`     | Comma operator expression.                                     |
| `ND_MEMBER`    | Struct or union member access.                                 |
| `ND_ADDR`      | Address-of (`&`) expression.                                   |
| `ND_DEREF`     | Pointer dereference (`*`) expression.                          |
| `ND_NOT`       | Logical NOT expression.                                        |
| `ND_BITNOT`    | Bitwise NOT expression.                                        |
| `ND_LOGAND`    | Logical AND expression with short-circuit semantics.           |
| `ND_LOGOR`     | Logical OR expression with short-circuit semantics.            |
| `ND_RETURN`    | Return statement.                                              |
| `ND_IF`        | `if` / `else` statement.                                       |
| `ND_FOR`       | `for`-style loop node used for normalized loop forms.          |
| `ND_DO`        | `do ... while` loop.                                           |
| `ND_SWITCH`    | `switch` statement.                                            |
| `ND_CASE`      | `case` or `default` label inside a switch.                     |
| `ND_BLOCK`     | Compound statement containing a `body` list.                   |
| `ND_GOTO`      | Direct `goto` statement.                                       |
| `ND_GOTO_EXPR` | Computed goto expression.                                      |
| `ND_LABEL`     | Labeled statement.                                             |
| `ND_LABEL_VAL` | GNU label-address expression such as `&&label`.                |
| `ND_FUNCALL`   | Function call expression.                                      |
| `ND_EXPR_STMT` | Expression statement.                                          |
| `ND_STMT_EXPR` | GNU statement-expression (`({ ... })`).                        |
| `ND_VAR`       | Variable reference expression.                                 |
| `ND_VLA_PTR`   | Internal node that references the storage backing a VLA.       |
| `ND_NUM`       | Numeric literal expression.                                    |
| `ND_CAST`      | Cast expression.                                               |
| `ND_MEMZERO`   | Internal zero-fill helper inserted by initialization lowering. |
| `ND_ASM`       | GNU inline assembly statement node.                            |
| `ND_CAS`       | Atomic compare-and-swap helper node.                           |
| `ND_EXCH`      | Atomic exchange helper node.                                   |

## License

Under MIT.

---

The following document is the original README for chibicc:

# chibicc: A Small C Compiler

(The old master has moved to
[historical/old](https://github.com/rui314/chibicc/tree/historical/old)
branch. This is a new one uploaded in September 2020.)

chibicc is yet another small C compiler that implements most C11
features. Even though it still probably falls into the "toy compilers"
category just like other small compilers do, chibicc can compile
several real-world programs, including [Git](https://git-scm.com/),
[SQLite](https://sqlite.org),
[libpng](http://www.libpng.org/pub/png/libpng.html) and chibicc
itself, without making modifications to the compiled programs.
Generated executables of these programs pass their corresponding test
suites. So, chibicc actually supports a wide variety of C11 features
and is able to compile hundreds of thousands of lines of real-world C
code correctly.

chibicc is developed as the reference implementation for a book I'm
currently writing about the C compiler and the low-level programming.
The book covers the vast topic with an incremental approach; in the first
chapter, readers will implement a "compiler" that accepts just a single
number as a "language", which will then gain one feature at a time in each
section of the book until the language that the compiler accepts matches
what the C11 spec specifies. I took this incremental approach from [the
paper](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf) by Abdulaziz
Ghuloum.

Each commit of this project corresponds to a section of the book. For this
purpose, not only the final state of the project but each commit was
carefully written with readability in mind. Readers should be able to learn
how a C language feature can be implemented just by reading one or a few
commits of this project. For example, this is how
[while](https://github.com/rui314/chibicc/commit/773115ab2a9c4b96f804311b95b20e9771f0190a),
[[]](https://github.com/rui314/chibicc/commit/75fbd3dd6efde12eac8225d8b5723093836170a5),
[?:](https://github.com/rui314/chibicc/commit/1d0e942fd567a35d296d0f10b7693e98b3dd037c),
and [thread-local
variable](https://github.com/rui314/chibicc/commit/79644e54cc1805e54428cde68b20d6d493b76d34)
are implemented. If you have plenty of spare time, it might be fun to read
it from the [first
commit](https://github.com/rui314/chibicc/commit/0522e2d77e3ab82d3b80a5be8dbbdc8d4180561c).

If you like this project, please consider purchasing a copy of the book
when it becomes available! 😀 I publish the source code here to give people
early access to it, because I was planing to do that anyway with a
permissive open-source license after publishing the book. If I don't charge
for the source code, it doesn't make much sense to me to keep it private. I
hope to publish the book in 2021.
You can sign up [here](https://forms.gle/sgrMWHGeGjeeEJcX7) to receive a
notification when a free chapter is available online or the book is published.

I pronounce chibicc as _chee bee cee cee_. "chibi" means "mini" or
"small" in Japanese. "cc" stands for C compiler.

## Status

chibicc supports almost all mandatory features and most optional
features of C11 as well as a few GCC language extensions.

Features that are often missing in a small compiler but supported by
chibicc include (but not limited to):

- Preprocessor
- float, double and long double (x87 80-bit floating point numbers)
- Bit-fields
- alloca()
- Variable-length arrays
- Compound literals
- Thread-local variables
- Atomic variables
- Common symbols
- Designated initializers
- L, u, U and u8 string literals
- Functions that take or return structs as values, as specified by the
  x86-64 SystemV ABI

chibicc does not support complex numbers, K&R-style function prototypes
and GCC-style inline assembly. Digraphs and trigraphs are intentionally
left out.

chibicc outputs a simple but nice error message when it finds an error in
source code.

There's no optimization pass. chibicc emits terrible code which is probably
twice or more slower than GCC's output. I have a plan to add an
optimization pass once the frontend is done.

I'm using Ubuntu 20.04 for x86-64 as a development platform. I made a
few small changes so that chibicc works on Ubuntu 18.04, Fedora 32 and
Gentoo 2.6, but portability is not my goal at this moment. It may or
may not work on systems other than Ubuntu 20.04.

## Internals

chibicc consists of the following stages:

- Tokenize: A tokenizer takes a string as an input, breaks it into a list
  of tokens and returns them.

- Preprocess: A preprocessor takes as an input a list of tokens and output
  a new list of macro-expanded tokens. It interprets preprocessor
  directives while expanding macros.

- Parse: A recursive descendent parser constructs abstract syntax trees
  from the output of the preprocessor. It also adds a type to each AST
  node.

- Codegen: A code generator emits an assembly text for given AST nodes.

## Contributing

When I find a bug in this compiler, I go back to the original commit that
introduced the bug and rewrite the commit history as if there were no such
bug from the beginning. This is an unusual way of fixing bugs, but as a
part of a book, it is important to keep every commit bug-free.

Thus, I do not take pull requests in this repo. You can send me a pull
request if you find a bug, but it is very likely that I will read your
patch and then apply that to my previous commits by rewriting history. I'll
credit your name somewhere, but your changes will be rewritten by me before
submitted to this repository.

Also, please assume that I will occasionally force-push my local repository
to this public one to rewrite history. If you clone this project and make
local commits on top of it, your changes will have to be rebased by hand
when I force-push new commits.

## Design principles

chibicc's core value is its simplicity and the reability of its source
code. To achieve this goal, I was careful not to be too clever when
writing code. Let me explain what that means.

Oftentimes, as you get used to the code base, you are tempted to
_improve_ the code using more abstractions and clever tricks.
But that kind of _improvements_ don't always improve readability for
first-time readers and can actually hurts it. I tried to avoid the
pitfall as much as possible. I wrote this code not for me but for
first-time readers.

If you take a look at the source code, you'll find a couple of
dumb-looking pieces of code. These are written intentionally that way
(but at some places I might be actually missing something,
though). Here is a few notable examples:

- The recursive descendent parser contains many similar-looking functions
  for similar-looking generative grammar rules. You might be tempted
  to _improve_ it to reduce the duplication using higher-order functions
  or macros, but I thought that that's too complicated. It's better to
  allow small duplications instead.

- chibicc doesn't try too hard to save memory. An entire input source
  file is read to memory first before the tokenizer kicks in, for example.

- Slow algorithms are fine if we know that n isn't too big.
  For example, we use a linked list as a set in the preprocessor, so
  the membership check takes O(n) where n is the size of the set. But
  that's fine because we know n is usually very small.
  And even if n can be very big, I stick with a simple slow algorithm
  until it is proved by benchmarks that that's a bottleneck.

- Each AST node type uses only a few members of the `Node` struct members.
  Other unused `Node` members are just a waste of memory at runtime.
  We could save memory using unions, but I decided to simply put everything
  in the same struct instead. I believe the inefficiency is negligible.
  Even if it matters, we can always change the code to use unions
  at any time. I wanted to avoid premature optimization.

- chibicc always allocates heap memory using `calloc`, which is a
  variant of `malloc` that clears memory with zero. `calloc` is
  slightly slower than `malloc`, but that should be neligible.

- Last but not least, chibicc allocates memory using `calloc` but never
  calls `free`. Allocated heap memory is not freed until the process exits.
  I'm sure that this memory management policy (or lack thereof) looks
  very odd, but it makes sense for short-lived programs such as compilers.
  DMD, a compiler for the D programming language, uses the same memory
  management scheme for the same reason, for example [1].

## About the Author

I'm Rui Ueyama. I'm the creator of [8cc](https://github.com/rui314/8cc),
which is a hobby C compiler, and also the original creator of the current
version of [LLVM lld](https://lld.llvm.org) linker, which is a
production-quality linker used by various operating systems and large-scale
build systems.

## References

- [tcc](https://bellard.org/tcc/): A small C compiler written by Fabrice
  Bellard. I learned a lot from this compiler, but the design of tcc and
  chibicc are different. In particular, tcc is a one-pass compiler, while
  chibicc is a multi-pass one.

- [lcc](https://github.com/drh/lcc): Another small C compiler. The creators
  wrote a [book](https://sites.google.com/site/lccretargetablecompiler/)
  about the internals of lcc, which I found a good resource to see how a
  compiler is implemented.

- [An Incremental Approach to Compiler
  Construction](http://scheme2006.cs.uchicago.edu/11-ghuloum.pdf)

- [Rob Pike's 5 Rules of Programming](https://users.ece.utexas.edu/~adnan/pike.html)

[1] https://www.drdobbs.com/cpp/increasing-compiler-speed-by-over-75/240158941

> DMD does memory allocation in a bit of a sneaky way. Since compilers
> are short-lived programs, and speed is of the essence, DMD just
> mallocs away, and never frees.
