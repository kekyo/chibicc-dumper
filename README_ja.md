# chibicc-dumper

C 言語のトークン列と AST を出力できる、`chibicc` 由来の JSON ダンプツール

[![Project Status: WIP – Initial development is in progress, but there has not yet been a stable, usable release suitable for the public.](https://www.repostatus.org/badges/latest/wip.svg)](https://www.repostatus.org/#wip)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/chibicc-dumper.svg)](https://www.npmjs.com/package/chibicc-dumper)

---

[(English language is here.)](./README.md)

## これは何?

FFI ブリッジを実装する開発では、作業内容は単調である一方、細部を詰めるにはかなりの手間がかかります。
この部分を実装するには、開発者はおおむね次の 3 つの手法を検討することになります:

- 「対象言語の仕組みからメタデータを出力し、それを使って glue 用の C ソースコードを生成する」
- あるいは「C ソースコードを多少荒っぽい方法で解析し、そこから glue コードを生成する」
- それらを諦めて、さらに面倒な「IDL のような抽象的な何か」から両方を出力する

もちろん、こうした作業をすべて自動化することはできません。
それでも、C ソースコードからトークン列や AST 情報を手軽に得られるとしたらどうでしょうか。
そのような情報からブリッジコードを自動生成できる可能性があります。
つまり、これまで諦めていた C ソースコードそのものを、メタデータの一次情報として扱えるようになります。

このツールは、それを実現するためのものです。
`chibicc` のソースコードからコードジェネレータを取り除き、代わりにその情報を JSON として出力するよう変更した、コンパクトなツールです。
トークナイザとパーサの出力を JSON としてダンプします。

たとえば、次のような最小のソースコード (`sample.c`) があるとします:

```c
int x;
```

`chibicc-dumper --dump-tokens --dump-ast sample.c` を実行すると、次の出力が得られます:

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

また、どのようなトークン列や AST が生成されるのかを調べる用途でも便利で、`chibicc` を学ぶ助けとして使えます。

### Clang でも AST は生成できる

しかし、Clang の出力は [公式に安定していないと明言されています。](https://clang.llvm.org/doxygen/JSONNodeDumper_8h_source.html)
一方で、`chibicc` は十分に安定しており、トークンや AST が変わる可能性は低いと考えられます。

### 環境

- Debian又はUbuntuのdebパッケージ配布 (ネイティブバイナリCLI・基本的にlibcのみに依存)
- NPMパッケージ (CLI,ライブラリ・他パッケージへの依存無し)

---

## インストール

[ビルド済みパッケージ](https://github.com/kekyo/chibicc-dumper/releases) を使って、システムにインストールできます:

- Debian trixie, bookworm: amd64, i686, arm64, armv7l (32-bit), riscv64
- Ubuntu 24.04, 22.04: amd64, arm64

あるいは、WASM を使う TypeScript/JavaScript 向けの `chibicc-dumper` NPM パッケージを利用できます:

```bash
npm install chibicc-dumper
```

このパッケージは `chibicc-dumper` CLI コマンドも公開しているため、`npx` やパッケージマネージャの bin shim 経由でそのまま実行できます:

```bash
npx chibicc-dumper --dump-tokens --dump-ast sample.c
```

あるいは、`make` でツールを自力でビルドできます:

```bash
make
```

実行ファイルは `./chibicc-dumper` として生成されます。

## 使い方

### CLI

```text
chibicc-dumper [--dump-tokens] [--dump-ast] [ -E ] [ -M | -MD ] [ -o <path> ] <file>
```

このダンパは、単一の C 翻訳単位を入力として受け取ります。

- `--dump-tokens`
  前処理前の生の phase 1 トークナイザ出力をダンプします。
- `--dump-ast`
  前処理後の phase 2 パーサ出力をダンプします。
- `--dump-tokens --dump-ast`
  両方の内容をひとつの JSON ドキュメントとして出力します。
- `-o <path>`
  JSON 出力を標準出力ではなくファイルに書き込みます。

`-I`、`-idirafter`、`-include`、`-D`、`-U`、`-x c|none`、`-E`、`-M*` といったプリプロセッサ向けのオプションも、フロントエンド解析で有用なため引き続き利用できます。

NPM パッケージの CLI も同じコマンドライン形式を使います。

```sh
npx chibicc-dumper --dump-ast sample.c
```

### 例

生のトークンを標準出力へダンプする:

```sh
chibicc-dumper --dump-tokens sample.c
```

解析済み AST をファイルへダンプする:

```sh
chibicc-dumper --dump-ast -o sample.ast.json sample.c
```

トークンと AST の両方をひとつの JSON ドキュメントとしてダンプする:

```sh
chibicc-dumper --dump-tokens --dump-ast -o sample.full.json sample.c
```

### TypeScript / JavaScript NPM パッケージ

パッケージ化された API では、WASM バイナリが生成される JavaScript バンドルに埋め込まれています。
そのため、実行時に外部の `.wasm` ファイルを取得する必要はありません。
各 API 呼び出しは新しい WASM インスタンスを作成し、`chibicc-dumper` を実行し、結果を回収した直後にそのインスタンスを破棄します。

生の JSON テキストが欲しい場合は `dumpJson()` を、パース済みの JavaScript オブジェクトが欲しい場合は `dump()` を使ってください。

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

`chibicc` に同梱されている組み込みヘッダは自動的に利用できるため、`#include <stddef.h>` のような標準ヘッダも追加設定なしで動作します。

```ts
import { dump } from 'chibicc-dumper';

const result = await dump({
  inputPath: 'main.c',
  source: '#include <stddef.h>\nsize_t value;\n',
});

console.log(result.tokens[0].kind);
```

プロジェクト固有のファイルは、`files` オプションまたは同期ホストコールバック経由で渡せます。
仮想パスは `/workspace` 配下に正規化されるため、`main.c` からの `#include "foo.h"` は `/workspace/foo.h` に解決されます。

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

主なオプションは次のとおりです。

- `inputPath`: メイン翻訳単位の仮想パス
- `source`: メイン翻訳単位の内容
- `files`: パスをキーにした追加の仮想ファイル
- `includePaths`: 追加の仮想 include ルート
- `dumpTokens`: JSON 出力にトークンデータを含める
- `dumpAst`: JSON 出力に AST データを含める
- `host.readFile`: `#include` 解決のためにファイル内容を同期的に返す
- `host.getFileTimestamp`: プリプロセッサが使うファイルタイムスタンプを上書きする
- `host.emitWarning`: ランタイムブリッジからの非致命診断を受け取る

---

## JSON 構造

出力は常に単一の JSON オブジェクトです。トップレベルの形は次のようになります。

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

`types` は常に存在します。`tokens` は `--dump-tokens` を指定した場合のみ、`ast` は `--dump-ast` を指定した場合のみ存在します。

トークン要素には、トークン種別、ソース上の字句、ソースファイル、行番号、行頭かどうか、空白情報といった字句情報が含まれます。
例:

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

AST 出力には、`typeId`、`baseTypeId`、`returnTypeId` などのフィールドを通じた正規化済み型参照が含まれます。
関数定義は `ast.globals` 配下に現れ、文や式のノードは各関数の `body` の下に入れ子で格納されます。
例:

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

### トークンの種類

| トークン      | 詳細                                                                 |
| :------------ | :------------------------------------------------------------------- |
| `TK_IDENT`    | トークナイザが出力する識別子トークン。                               |
| `TK_PUNCT`    | `(`、`)`、`+`、`->` などの記号または演算子トークン。                 |
| `TK_KEYWORD`  | キーワード分類後の予約語。                                           |
| `TK_STR`      | デコード済み文字列バイト列と文字列型を持つ文字列リテラルトークン。   |
| `TK_NUM`      | 意味解析後の数値トークン。                                           |
| `TK_PP_NUM`   | 最終的な数値解釈前のプリプロセッサ数値トークン。                     |
| `TK_EOF`      | すべてのトークン列の末尾に追加される EOF センチネルトークン。        |

### AST ノードの種類

| 型            | 詳細                                                                 |
| :------------ | :------------------------------------------------------------------- |
| `TY_VOID`     | `void` 型。                                                          |
| `TY_BOOL`     | `_Bool` 型。                                                         |
| `TY_CHAR`     | `char` 型。                                                          |
| `TY_SHORT`    | `short` 型。                                                         |
| `TY_INT`      | `int` 型。                                                           |
| `TY_LONG`     | `long` 型。                                                          |
| `TY_FLOAT`    | `float` 型。                                                         |
| `TY_DOUBLE`   | `double` 型。                                                        |
| `TY_LDOUBLE`  | `long double` 型。                                                   |
| `TY_ENUM`     | enum 型。                                                            |
| `TY_PTR`      | `baseTypeId` が参照先型を指すポインタ型。                            |
| `TY_FUNC`     | `returnTypeId` と `paramTypeIds` を持つ関数型。                      |
| `TY_ARRAY`    | `baseTypeId` と `arrayLen` を持つ固定長配列型。                      |
| `TY_VLA`      | 可変長配列型。                                                       |
| `TY_STRUCT`   | メンバレイアウト情報を含む struct 型。                               |
| `TY_UNION`    | メンバレイアウト情報を含む union 型。                                |

| ノード         | 詳細                                                                 |
| :------------- | :------------------------------------------------------------------- |
| `ND_NULL_EXPR` | no-op の式プレースホルダ。                                           |
| `ND_ADD`       | 加算式。                                                             |
| `ND_SUB`       | 減算式。                                                             |
| `ND_MUL`       | 乗算式。                                                             |
| `ND_DIV`       | 除算式。                                                             |
| `ND_NEG`       | 単項マイナス式。                                                     |
| `ND_MOD`       | 余り式。                                                             |
| `ND_BITAND`    | ビット AND 式。                                                      |
| `ND_BITOR`     | ビット OR 式。                                                       |
| `ND_BITXOR`    | ビット XOR 式。                                                      |
| `ND_SHL`       | 左シフト式。                                                         |
| `ND_SHR`       | 右シフト式。                                                         |
| `ND_EQ`        | 等値比較式。                                                         |
| `ND_NE`        | 非等値比較式。                                                       |
| `ND_LT`        | 小なり比較式。                                                       |
| `ND_LE`        | 以下比較式。                                                         |
| `ND_ASSIGN`    | 代入式。                                                             |
| `ND_COND`      | 三項条件演算子 (`?:`) の式。                                         |
| `ND_COMMA`     | コンマ演算子式。                                                     |
| `ND_MEMBER`    | struct または union のメンバアクセス。                               |
| `ND_ADDR`      | アドレス取得 (`&`) 式。                                              |
| `ND_DEREF`     | ポインタ間接参照 (`*`) 式。                                          |
| `ND_NOT`       | 論理否定式。                                                         |
| `ND_BITNOT`    | ビット否定式。                                                       |
| `ND_LOGAND`    | 短絡評価を行う論理 AND 式。                                          |
| `ND_LOGOR`     | 短絡評価を行う論理 OR 式。                                           |
| `ND_RETURN`    | `return` 文。                                                        |
| `ND_IF`        | `if` / `else` 文。                                                   |
| `ND_FOR`       | 正規化されたループ形式で使われる `for` 系ループノード。              |
| `ND_DO`        | `do ... while` ループ。                                              |
| `ND_SWITCH`    | `switch` 文。                                                        |
| `ND_CASE`      | switch 内の `case` または `default` ラベル。                         |
| `ND_BLOCK`     | `body` リストを持つ複合文。                                          |
| `ND_GOTO`      | 直接 `goto` 文。                                                     |
| `ND_GOTO_EXPR` | 計算 goto 式。                                                       |
| `ND_LABEL`     | ラベル付き文。                                                       |
| `ND_LABEL_VAL` | `&&label` のような GNU のラベルアドレス式。                          |
| `ND_FUNCALL`   | 関数呼び出し式。                                                     |
| `ND_EXPR_STMT` | 式文。                                                               |
| `ND_STMT_EXPR` | GNU の statement-expression (`({ ... })`)。                          |
| `ND_VAR`       | 変数参照式。                                                         |
| `ND_VLA_PTR`   | VLA を裏で支えるストレージを参照する内部ノード。                     |
| `ND_NUM`       | 数値リテラル式。                                                     |
| `ND_CAST`      | キャスト式。                                                         |
| `ND_MEMZERO`   | 初期化 lowering により挿入される内部ゼロ埋めヘルパ。                |
| `ND_ASM`       | GNU inline assembly 文ノード。                                       |
| `ND_CAS`       | アトミック compare-and-swap 用ヘルパノード。                         |
| `ND_EXCH`      | アトミック exchange 用ヘルパノード。                                 |

---

## License

Under MIT.

## オリジナルのchibiccについて

[chibiccの元のREADMEを参照してください](./README_chibicc.md)
