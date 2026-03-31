# chibicc-dumper

A JSON dumper tool derived from chibicc that can output C language tokens and ASTs.

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/chibicc-dumper.svg)](https://www.npmjs.com/package/chibicc-dumper)

---

[(Japanese language is here/日本語はこちら)](./README_ja.md)

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

### Environment

- Debian or Ubuntu DEB package distribution (native binary CLI; depends primarily on libc)
- NPM package (CLI, library; no dependencies on other packages)

---

## Install

You can install it on your system using the [pre-built packages](https://github.com/kekyo/chibicc-dumper/releases),

- Debian trixie, bookworm: amd64, i686, arm64, armv7l (32-bit), and riscv64
- Ubuntu 24.04, 22.04: amd64 and arm64

Or, you can use the `chibicc-dumper` NPM package for TypeScript/JavaScript using WASM:

```bash
npm install chibicc-dumper
```

The package also exposes the `chibicc-dumper` CLI command, so you can run it
directly with `npx` or through your package manager's bin shim:

```bash
npx chibicc-dumper --dump-tokens --dump-ast sample.c
```

Alternatively, build the tool with `make`:

```bash
make
```

The executable is generated as `./chibicc-dumper`.

## Usage

### CLI

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

The npm package CLI uses the same command-line format:

```sh
npx chibicc-dumper --dump-ast sample.c
```

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

### TypeScript / JavaScript NPM package

The packaged API embeds the WASM binary into the generated JavaScript bundle,
so it does not need to fetch an external `.wasm` file at runtime. Each API call
creates a fresh WASM instance, runs `chibicc-dumper`, and disposes that
instance immediately after collecting the result.

Use `dumpJson()` when you want the raw JSON text, or `dump()` when you want the
parsed JavaScript object.

```ts
import { dump, dumpJson } from 'chibicc-dumper';

const json = await dumpJson({
  inputPath: 'main.c',
  source: 'int main(void) { return 0; }\n',
});

const result = await dump({
  inputPath: 'main.c',
  source: 'int main(void) { return 0; }\n',
});

console.log(json);
console.log(result.ast.kind);
```

Builtin headers bundled with `chibicc` are available automatically, so standard
includes such as `#include <stddef.h>` work without extra setup.

```ts
import { dump } from 'chibicc-dumper';

const result = await dump({
  inputPath: 'main.c',
  source: '#include <stddef.h>\nsize_t value;\n',
});

console.log(result.tokens[0].kind);
```

Project-specific files can be provided through the `files` option or through
synchronous host callbacks. Virtual paths are normalized under `/workspace`, so
`#include "foo.h"` from `main.c` resolves to `/workspace/foo.h`.

```ts
import { dump } from 'chibicc-dumper';

const result = await dump({
  inputPath: 'main.c',
  source: '#include "foo.h"\nint main(void) { return VALUE; }\n',
  host: {
    readFile: (path) => {
      if (path === '/workspace/foo.h') {
        return '#define VALUE 7\n';
      }
      return undefined;
    },
  },
});

console.log(result.ast.globals[0].body.body[0].lhs.val);
```

The main options are:

- `inputPath`: virtual path of the main translation unit.
- `source`: contents of the main translation unit.
- `files`: additional virtual files keyed by path.
- `includePaths`: extra virtual include roots.
- `dumpTokens`: include token data in the JSON output.
- `dumpAst`: include AST data in the JSON output.
- `host.readFile`: synchronously provide file contents for `#include`
  resolution.
- `host.getFileTimestamp`: override file timestamps used by the preprocessor.
- `host.emitWarning`: receive non-fatal diagnostics from the runtime bridge.

---

## JSON structure

The output is always a single JSON object. The top-level shape is:

```json
{
  "types": [...],
  "tokens": [...],
  "ast": {
    "kind": "program",
    "globals": [...]
  },
  "scopes": [...],
  "tags": [...],
  "typedefs": [...]
}
```

`types` is always present. `tokens` is present only when `--dump-tokens` is
requested. `ast`, `scopes`, `tags`, and `typedefs` are present only when
`--dump-ast` is requested.

Token entries contain lexical information such as token kind, source lexeme,
source file, line number, beginning-of-line state, and whitespace information.
Comment tokens (`TK_COMMENT`) additionally include `commentStyle`, `endLine`,
and stripped comment `text`.
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
`body`. Declaration-like entries such as globals/functions and struct or union
members may also include `headerComments` when a leading comment block is
detected. `types[].tag` / `types[].tagToken` expose struct/union/enum tag
names, and `typedefs[]` plus `tags[]` enumerate typedef and tag declarations by
scope. For example:

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
| `TK_COMMENT` | Line (`//`) or block (`/* ... */`) comment token.                 |
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

---

## Example: Converting JSON into TypeScript Type Expressions

The emitted JSON can be used as source data for building TypeScript `type`
expressions that mirror the shape of a C `struct`.
This example focuses only on copying member names and member type shapes.
It does not try to address exact memory layout compatibility, ABI concerns,
padding, alignment, or the other details required for real FFI bindings.

Start with a small C input.
If you attach comments to struct members, and also to the declaration that uses
the struct, you can later read those comments back as hints.

```c
struct Point {
  /* ffi:i32 */
  int x;
  /* ffi:u16 */
  unsigned short y;
};

/* ffi:type:Point */
struct Point global_point;
```

When you dump this with `--dump-ast`, you get JSON roughly like this.
The important points are:

- The struct itself appears as a `TY_STRUCT` entry in the `types` array.
- Member enumeration comes from `types[*].members`.
- To find which struct to use, follow `ast.globals[*].typeId` to `types[*].id`.

Rather than searching for a specific `struct` by name directly, it is often
easier to first find a declaration that uses that type, such as a global
variable or function parameter, and then start from its `typeId`.

```json
{
  "types": [
    {
      "id": 1,
      "kind": "TY_STRUCT",
      "tag": "Point",
      "members": [
        {
          "name": "x",
          "typeId": 2,
          "headerComments": [
            {
              "style": "block",
              "text": " ffi:i32 "
            }
          ],
          "offset": 0,
          "align": 4,
          "index": 0,
          "isBitfield": false,
          "bitOffset": 0,
          "bitWidth": 0
        },
        {
          "name": "y",
          "typeId": 3,
          "headerComments": [
            {
              "style": "block",
              "text": " ffi:u16 "
            }
          ],
          "offset": 4,
          "align": 2,
          "index": 1,
          "isBitfield": false,
          "bitOffset": 0,
          "bitWidth": 0
        }
      ]
    },
    {
      "id": 2,
      "kind": "TY_INT",
      "isUnsigned": false
    },
    {
      "id": 3,
      "kind": "TY_SHORT",
      "isUnsigned": true
    }
  ],
  "ast": {
    "globals": [
      {
        "name": "global_point",
        "typeId": 1,
        "headerComments": [
          {
            "style": "block",
            "text": " ffi:type:Point "
          }
        ]
      }
    ]
  }
}
```

The following minimal example reads that JSON and emits TypeScript bindings such
as `type Point = { ... }`.
Because `typeId` is a reference ID rather than an array index, it is safest to
build a `Map` first.
You can now also use `types[].tag` and `typedefs[]`, so a type name or typedef
alias can be recovered even when no `ffi:type:...` comment is present.
In the example below, comments are treated as optional extra FFI hints, while
the JSON payload itself is the primary source of naming information.

```ts
import { dumpJson } from 'chibicc-dumper';

interface DumpHeaderComment {
  readonly text: string;
}

interface DumpMember {
  readonly name: string | null;
  readonly typeId: number;
  readonly headerComments?: readonly DumpHeaderComment[];
}

interface DumpType {
  readonly id: number;
  readonly kind: string;
  readonly tag?: string;
  readonly isUnsigned?: boolean;
  readonly baseTypeId?: number;
  readonly members?: readonly DumpMember[];
}

interface DumpTypedef {
  readonly name: string;
  readonly typeId: number;
}

interface DumpGlobal {
  readonly name: string;
  readonly typeId: number;
  readonly headerComments?: readonly DumpHeaderComment[];
}

interface DumpResult {
  readonly types: readonly DumpType[];
  readonly typedefs?: readonly DumpTypedef[];
  readonly ast?: {
    readonly globals: readonly DumpGlobal[];
  };
}

const scalarKinds = new Set([
  'TY_CHAR',
  'TY_SHORT',
  'TY_INT',
  'TY_LONG',
  'TY_FLOAT',
  'TY_DOUBLE',
  'TY_LDOUBLE',
  'TY_ENUM',
]);

const findFfiAnnotation = (
  comments: readonly DumpHeaderComment[] | undefined
): string | undefined =>
  comments
    ?.map((comment) => comment.text.trim())
    .find((text) => text.startsWith('ffi:'));

const renderStructLiteral = (
  members: readonly DumpMember[],
  typeById: ReadonlyMap<number, DumpType>,
  seen: ReadonlySet<number>
): string => {
  const lines = members.map((member) => {
    if (member.name === null) {
      throw new Error('Anonymous members need custom handling.');
    }

    const annotation = findFfiAnnotation(member.headerComments);
    const annotationLine = annotation ? `  /** ${annotation} */\n` : '';
    return `${annotationLine}  ${member.name}: ${renderType(member.typeId, typeById, seen)};`;
  });

  return `{\n${lines.join('\n')}\n}`;
};

const renderExampleObjectLiteral = (
  members: readonly DumpMember[],
  typeById: ReadonlyMap<number, DumpType>,
  seen: ReadonlySet<number>
): string => {
  const lines = members.map((member) => {
    if (member.name === null) {
      throw new Error('Anonymous members need custom handling.');
    }

    return `  ${member.name}: ${renderExampleValue(member.typeId, typeById, seen)},`;
  });

  return `{\n${lines.join('\n')}\n}`;
};

const renderType = (
  typeId: number,
  typeById: ReadonlyMap<number, DumpType>,
  seen: ReadonlySet<number> = new Set()
): string => {
  const ty = typeById.get(typeId);
  if (!ty) {
    throw new Error(`Unknown typeId: ${typeId}`);
  }

  if (scalarKinds.has(ty.kind)) {
    return 'number';
  }

  switch (ty.kind) {
    case 'TY_BOOL':
      return 'boolean';
    case 'TY_PTR':
      return 'number';
    case 'TY_ARRAY':
      if (ty.baseTypeId === undefined) {
        throw new Error(`TY_ARRAY ${typeId} has no baseTypeId.`);
      }
      return `${renderType(ty.baseTypeId, typeById, seen)}[]`;
    case 'TY_STRUCT':
    case 'TY_UNION':
      if (!ty.members) {
        throw new Error(`${ty.kind} ${typeId} has no members.`);
      }
      if (seen.has(typeId)) {
        return '{ /* recursive */ }';
      }
      return renderStructLiteral(
        ty.members,
        typeById,
        new Set([...seen, typeId])
      );
    default:
      return 'unknown';
  }
};

const renderExampleValue = (
  typeId: number,
  typeById: ReadonlyMap<number, DumpType>,
  seen: ReadonlySet<number> = new Set()
): string => {
  const ty = typeById.get(typeId);
  if (!ty) {
    throw new Error(`Unknown typeId: ${typeId}`);
  }

  if (scalarKinds.has(ty.kind)) {
    return '0';
  }

  switch (ty.kind) {
    case 'TY_BOOL':
      return 'false';
    case 'TY_PTR':
      return '0';
    case 'TY_ARRAY':
      return '[]';
    case 'TY_STRUCT':
    case 'TY_UNION':
      if (!ty.members) {
        throw new Error(`${ty.kind} ${typeId} has no members.`);
      }
      if (seen.has(typeId)) {
        return '{}';
      }
      return renderExampleObjectLiteral(
        ty.members,
        typeById,
        new Set([...seen, typeId])
      );
    default:
      return 'undefined as never';
  }
};

const generatePointBindings = async (): Promise<string> => {
  const dumpText = await dumpJson({
    inputPath: 'point.c',
    source: `
struct Point {
  /* ffi:i32 */
  int x;
  /* ffi:u16 */
  unsigned short y;
};

/* ffi:type:Point */
struct Point global_point;
`.trimStart(),
    dumpTokens: false,
    dumpAst: true,
  });

  const result = JSON.parse(dumpText) as DumpResult;
  const typeById = new Map(result.types.map((ty) => [ty.id, ty]));

  const target = result.ast?.globals.find(
    (global) => global.name === 'global_point'
  );
  if (!target) {
    throw new Error('global_point not found.');
  }

  const targetType = typeById.get(target.typeId);
  if (!targetType) {
    throw new Error(`Unknown target type: ${target.typeId}`);
  }

  const aliasName =
    targetType.tag ??
    result.typedefs?.find((entry) => entry.typeId === target.typeId)?.name ??
    findFfiAnnotation(target.headerComments)?.replace(/^ffi:type:/, '') ??
    'GeneratedType';

  return [
    `type ${aliasName} = ${renderType(target.typeId, typeById)};`,
    `const ${target.name}: ${aliasName} = ${renderExampleValue(target.typeId, typeById)};`,
  ].join('\n\n');
};

console.log(await generatePointBindings());
```

The output looks like this:

```ts
type Point = {
  /** ffi:i32 */
  x: number;
  /** ffi:u16 */
  y: number;
};

const global_point: Point = {
  x: 0,
  y: 0,
};
```

The key implementation points in this example are:

- Identify the struct by starting from a declaration node such as
  `ast.globals`, taking its `typeId`, and resolving that ID in `types`.
- Enumerate members from the `members` array of a `TY_STRUCT` or `TY_UNION`.
- Determine each member type by resolving `member.typeId` in `types` and
  checking fields such as `kind`, `isUnsigned`, and `baseTypeId`.
- Struct/union/enum tag names are available from `types[].tag`, and typedef
  aliases are available from `typedefs[]`. Comments are optional extra hints,
  not the only naming source.
- If simple scalar coverage is enough, mapping `TY_INT` and `TY_SHORT` to
  `number`, and `TY_BOOL` to `boolean`, is already useful.
- If you also want a value-side skeleton, you can reuse the same type walk to
  generate defaults such as `0`, `false`, `[]`, and `{ ... }`, which is enough
  to emit `const global_point: Point = { ... }`.
- Nested structs can be handled by recursively following `TY_STRUCT` /
  `TY_UNION`. If you want separate named `type` aliases, add a naming rule for
  recursive expansion.
- Pointers appear as `TY_PTR`. If you only want to mirror JSON shape, you can
  map them to `number` or a custom alias such as `Pointer<T>`, but real FFI use
  needs additional design.
- Fixed-size arrays can be converted from `TY_ARRAY` plus `baseTypeId` and
  `arrayLen` into `T[]` or tuple-like forms.
- Comments can be read back from `headerComments` on globals/functions and
  struct/union members. Strings such as `ffi:type:Point` or `ffi:u16` can serve
  as future hints for FFI conversion or other custom annotations.

---

## License

Under MIT.

## About original chibicc

[Read the original README for chibicc](./chibicc/README_chibicc.md).
