/**
 * Token kind emitted by the JSON dumper.
 */
export type ChibiccDumperTokenKind =
  | 'TK_IDENT'
  | 'TK_PUNCT'
  | 'TK_KEYWORD'
  | 'TK_STR'
  | 'TK_NUM'
  | 'TK_PP_NUM'
  | 'TK_COMMENT'
  | 'TK_EOF';

/**
 * Type kind emitted by the JSON dumper.
 */
export type ChibiccDumperTypeKind =
  | 'TY_VOID'
  | 'TY_BOOL'
  | 'TY_CHAR'
  | 'TY_SHORT'
  | 'TY_INT'
  | 'TY_LONG'
  | 'TY_FLOAT'
  | 'TY_DOUBLE'
  | 'TY_LDOUBLE'
  | 'TY_ENUM'
  | 'TY_PTR'
  | 'TY_FUNC'
  | 'TY_ARRAY'
  | 'TY_VLA'
  | 'TY_STRUCT'
  | 'TY_UNION';

/**
 * AST node kind emitted by the JSON dumper.
 */
export type ChibiccDumperNodeKind =
  | 'ND_NULL_EXPR'
  | 'ND_ADD'
  | 'ND_SUB'
  | 'ND_MUL'
  | 'ND_DIV'
  | 'ND_NEG'
  | 'ND_MOD'
  | 'ND_BITAND'
  | 'ND_BITOR'
  | 'ND_BITXOR'
  | 'ND_SHL'
  | 'ND_SHR'
  | 'ND_EQ'
  | 'ND_NE'
  | 'ND_LT'
  | 'ND_LE'
  | 'ND_ASSIGN'
  | 'ND_COND'
  | 'ND_COMMA'
  | 'ND_MEMBER'
  | 'ND_ADDR'
  | 'ND_DEREF'
  | 'ND_NOT'
  | 'ND_BITNOT'
  | 'ND_LOGAND'
  | 'ND_LOGOR'
  | 'ND_RETURN'
  | 'ND_IF'
  | 'ND_FOR'
  | 'ND_DO'
  | 'ND_SWITCH'
  | 'ND_CASE'
  | 'ND_BLOCK'
  | 'ND_GOTO'
  | 'ND_GOTO_EXPR'
  | 'ND_LABEL'
  | 'ND_LABEL_VAL'
  | 'ND_FUNCALL'
  | 'ND_EXPR_STMT'
  | 'ND_STMT_EXPR'
  | 'ND_VAR'
  | 'ND_VLA_PTR'
  | 'ND_NUM'
  | 'ND_CAST'
  | 'ND_MEMZERO'
  | 'ND_ASM'
  | 'ND_CAS'
  | 'ND_EXCH';

/**
 * Parsed scope kind emitted by the JSON dumper.
 */
export type ChibiccDumperScopeKind = 'translation-unit' | 'function' | 'block';

/**
 * Comment style emitted for comment tokens and header comments.
 */
export type ChibiccDumperCommentStyle = 'line' | 'block';

/**
 * Source token location summary.
 */
export interface ChibiccDumperTokenRef {
  /** File Source file path. */
  readonly file: string;
  /** Line 1-based line number. */
  readonly line: number;
  /** Lexeme Source lexeme text. */
  readonly lexeme: string;
}

/**
 * Grouped header comment metadata attached to declarations.
 */
export interface ChibiccDumperHeaderComment {
  /** Style Comment style of the first token in the group. */
  readonly style: ChibiccDumperCommentStyle;
  /** File Source file path. */
  readonly file: string;
  /** Line 1-based starting line. */
  readonly line: number;
  /** EndLine 1-based inclusive ending line. */
  readonly endLine: number;
  /** Text Joined comment text. */
  readonly text: string;
  /** Tokens Source tokens that formed the comment group. */
  readonly tokens: readonly ChibiccDumperTokenRef[];
}

/**
 * Variable-like reference emitted from AST nodes.
 */
export interface ChibiccDumperVariableRef {
  /** Name Object name. */
  readonly name: string;
  /** TypeId Referenced type identifier. */
  readonly typeId: number;
  /** IsLocal Whether the object belongs to local storage. */
  readonly isLocal: boolean;
  /** IsFunction Whether the object is a function. */
  readonly isFunction: boolean;
  /** IsDefinition Whether the declaration is a definition. */
  readonly isDefinition: boolean;
  /** IsStatic Whether the object has internal linkage. */
  readonly isStatic: boolean;
  /** IsTentative Whether the declaration is tentative. */
  readonly isTentative: boolean;
  /** IsTls Whether the object is thread-local. */
  readonly isTls: boolean;
}

/**
 * Relocation entry emitted for initialized global objects.
 */
export interface ChibiccDumperRelocation {
  /** Offset Byte offset in the initializer blob. */
  readonly offset: number;
  /** Label Referenced label name, or `null` for a pure addend. */
  readonly label: string | null;
  /** Addend Signed relocation addend. */
  readonly addend: number;
}

/**
 * Struct or union member metadata.
 */
export interface ChibiccDumperMember {
  /** Name Member name, or `null` for anonymous members. */
  readonly name: string | null;
  /** TypeId Member type identifier. */
  readonly typeId: number;
  /** HeaderComments Header comments attached to the member declaration. */
  readonly headerComments?: readonly ChibiccDumperHeaderComment[];
  /** Offset Byte offset within the aggregate. */
  readonly offset: number;
  /** Align Alignment requirement in bytes. */
  readonly align: number;
  /** Index Stable member index within the aggregate. */
  readonly index: number;
  /** IsBitfield Whether the member is a bit-field. */
  readonly isBitfield: boolean;
  /** BitOffset Bit offset from the containing storage unit. */
  readonly bitOffset: number;
  /** BitWidth Declared bit width. */
  readonly bitWidth: number;
}

interface ChibiccDumperTokenBase<
  K extends ChibiccDumperTokenKind,
> extends ChibiccDumperTokenRef {
  /** Kind Token kind discriminator. */
  readonly kind: K;
  /** AtBol Whether the token appears at the beginning of a line. */
  readonly atBol: boolean;
  /** HasSpace Whether the token is preceded by whitespace. */
  readonly hasSpace: boolean;
  /** TypeId Referenced type identifier when the token carries type metadata. */
  readonly typeId?: number;
}

/**
 * Dumped token for `TK_IDENT`.
 */
export interface ChibiccDumperIdentifierToken extends ChibiccDumperTokenBase<'TK_IDENT'> {}

/**
 * Dumped token for `TK_PUNCT`.
 */
export interface ChibiccDumperPunctuatorToken extends ChibiccDumperTokenBase<'TK_PUNCT'> {}

/**
 * Dumped token for `TK_KEYWORD`.
 *
 * @remarks `dumpTokens()` currently emits raw phase-1 tokens, so this shape is
 * defined for completeness even when runtime samples are rare.
 */
export interface ChibiccDumperKeywordToken extends ChibiccDumperTokenBase<'TK_KEYWORD'> {}

/**
 * Dumped token for `TK_STR`.
 */
export interface ChibiccDumperStringToken extends ChibiccDumperTokenBase<'TK_STR'> {
  /** StringBytes UTF-8 bytes including the terminating `\0`. */
  readonly stringBytes: readonly number[];
}

/**
 * Dumped token for `TK_NUM`.
 */
export interface ChibiccDumperNumberToken extends ChibiccDumperTokenBase<'TK_NUM'> {
  /** Value Integer value when the token is integral. */
  readonly value?: number;
  /** Fvalue Decimal string when the token is floating-point. */
  readonly fvalue?: string;
}

/**
 * Dumped token for `TK_PP_NUM`.
 */
export interface ChibiccDumperPreprocessingNumberToken extends ChibiccDumperTokenBase<'TK_PP_NUM'> {}

/**
 * Dumped token for `TK_COMMENT`.
 */
export interface ChibiccDumperCommentToken extends ChibiccDumperTokenBase<'TK_COMMENT'> {
  /** CommentStyle Source comment style. */
  readonly commentStyle: ChibiccDumperCommentStyle;
  /** EndLine 1-based inclusive ending line. */
  readonly endLine: number;
  /** Text Comment body without delimiters. */
  readonly text: string;
}

/**
 * Dumped token for `TK_EOF`.
 */
export interface ChibiccDumperEndOfFileToken extends ChibiccDumperTokenBase<'TK_EOF'> {}

/**
 * Union of all dumped token interfaces.
 */
export type ChibiccDumperToken =
  | ChibiccDumperIdentifierToken
  | ChibiccDumperPunctuatorToken
  | ChibiccDumperKeywordToken
  | ChibiccDumperStringToken
  | ChibiccDumperNumberToken
  | ChibiccDumperPreprocessingNumberToken
  | ChibiccDumperCommentToken
  | ChibiccDumperEndOfFileToken;

interface ChibiccDumperTypeBase<K extends ChibiccDumperTypeKind> {
  /** Id Stable type identifier within one dump result. */
  readonly id: number;
  /** Kind Type kind discriminator. */
  readonly kind: K;
  /** Size Size of the type in bytes. */
  readonly size: number;
  /** Align Alignment requirement in bytes. */
  readonly align: number;
  /** IsUnsigned Whether the type is unsigned. */
  readonly isUnsigned: boolean;
  /** IsAtomic Whether the type is qualified with `_Atomic`. */
  readonly isAtomic: boolean;
  /** OriginTypeId Origin type identifier used for compatibility tracking. */
  readonly originTypeId: number | null;
  /** Name Declared name associated with the type, when available. */
  readonly name?: string;
  /** NameToken Source token for the declared name, when available. */
  readonly nameToken?: ChibiccDumperTokenRef;
  /** Tag Declared struct/union/enum tag name, when available. */
  readonly tag?: string;
  /** TagToken Source token for the declared tag, when available. */
  readonly tagToken?: ChibiccDumperTokenRef;
}

interface ChibiccDumperBasedTypeBase<
  K extends ChibiccDumperTypeKind,
> extends ChibiccDumperTypeBase<K> {
  /** BaseTypeId Referenced base type identifier. */
  readonly baseTypeId: number;
}

interface ChibiccDumperAggregateTypeBase<
  K extends 'TY_STRUCT' | 'TY_UNION',
> extends ChibiccDumperTypeBase<K> {
  /** Members Member list in declaration order. */
  readonly members: readonly ChibiccDumperMember[];
  /** IsFlexible Whether the aggregate has a flexible array member. */
  readonly isFlexible: boolean;
  /** IsPacked Whether the aggregate is packed. */
  readonly isPacked: boolean;
}

/**
 * Dumped type for `TY_VOID`.
 */
export interface ChibiccDumperVoidType extends ChibiccDumperTypeBase<'TY_VOID'> {}

/**
 * Dumped type for `TY_BOOL`.
 */
export interface ChibiccDumperBooleanType extends ChibiccDumperTypeBase<'TY_BOOL'> {}

/**
 * Dumped type for `TY_CHAR`.
 */
export interface ChibiccDumperCharType extends ChibiccDumperTypeBase<'TY_CHAR'> {}

/**
 * Dumped type for `TY_SHORT`.
 */
export interface ChibiccDumperShortType extends ChibiccDumperTypeBase<'TY_SHORT'> {}

/**
 * Dumped type for `TY_INT`.
 */
export interface ChibiccDumperIntType extends ChibiccDumperTypeBase<'TY_INT'> {}

/**
 * Dumped type for `TY_LONG`.
 */
export interface ChibiccDumperLongType extends ChibiccDumperTypeBase<'TY_LONG'> {}

/**
 * Dumped type for `TY_FLOAT`.
 */
export interface ChibiccDumperFloatType extends ChibiccDumperTypeBase<'TY_FLOAT'> {}

/**
 * Dumped type for `TY_DOUBLE`.
 */
export interface ChibiccDumperDoubleType extends ChibiccDumperTypeBase<'TY_DOUBLE'> {}

/**
 * Dumped type for `TY_LDOUBLE`.
 */
export interface ChibiccDumperLongDoubleType extends ChibiccDumperTypeBase<'TY_LDOUBLE'> {}

/**
 * Dumped type for `TY_ENUM`.
 */
export interface ChibiccDumperEnumType extends ChibiccDumperTypeBase<'TY_ENUM'> {}

/**
 * Dumped type for `TY_PTR`.
 */
export interface ChibiccDumperPointerType extends ChibiccDumperBasedTypeBase<'TY_PTR'> {}

/**
 * Dumped type for `TY_FUNC`.
 */
export interface ChibiccDumperFunctionType extends ChibiccDumperTypeBase<'TY_FUNC'> {
  /** ReturnTypeId Return type identifier. */
  readonly returnTypeId: number;
  /** ParamTypeIds Parameter type identifiers in declaration order. */
  readonly paramTypeIds: readonly number[];
  /** IsVariadic Whether the function type is variadic. */
  readonly isVariadic: boolean;
}

/**
 * Dumped type for `TY_ARRAY`.
 */
export interface ChibiccDumperArrayType extends ChibiccDumperBasedTypeBase<'TY_ARRAY'> {
  /** ArrayLen Declared array length. */
  readonly arrayLen: number;
}

/**
 * Dumped type for `TY_VLA`.
 */
export interface ChibiccDumperVariableLengthArrayType extends ChibiccDumperBasedTypeBase<'TY_VLA'> {
  /** VlaLen AST node for the runtime length expression. */
  readonly vlaLen: ChibiccDumperNode;
}

/**
 * Dumped type for `TY_STRUCT`.
 */
export interface ChibiccDumperStructType extends ChibiccDumperAggregateTypeBase<'TY_STRUCT'> {}

/**
 * Dumped type for `TY_UNION`.
 */
export interface ChibiccDumperUnionType extends ChibiccDumperAggregateTypeBase<'TY_UNION'> {}

/**
 * Union of all dumped type interfaces.
 */
export type ChibiccDumperType =
  | ChibiccDumperVoidType
  | ChibiccDumperBooleanType
  | ChibiccDumperCharType
  | ChibiccDumperShortType
  | ChibiccDumperIntType
  | ChibiccDumperLongType
  | ChibiccDumperFloatType
  | ChibiccDumperDoubleType
  | ChibiccDumperLongDoubleType
  | ChibiccDumperEnumType
  | ChibiccDumperPointerType
  | ChibiccDumperFunctionType
  | ChibiccDumperArrayType
  | ChibiccDumperVariableLengthArrayType
  | ChibiccDumperStructType
  | ChibiccDumperUnionType;

interface ChibiccDumperNodeBase<K extends ChibiccDumperNodeKind> {
  /** Kind AST node kind discriminator. */
  readonly kind: K;
  /** TypeId Referenced type identifier when semantic analysis assigned one. */
  readonly typeId?: number;
  /** Token Representative source token for the node. */
  readonly token?: ChibiccDumperTokenRef;
}

type ChibiccDumperBinaryNodeKind =
  | 'ND_ADD'
  | 'ND_SUB'
  | 'ND_MUL'
  | 'ND_DIV'
  | 'ND_MOD'
  | 'ND_BITAND'
  | 'ND_BITOR'
  | 'ND_BITXOR'
  | 'ND_SHL'
  | 'ND_SHR'
  | 'ND_EQ'
  | 'ND_NE'
  | 'ND_LT'
  | 'ND_LE'
  | 'ND_ASSIGN'
  | 'ND_COMMA'
  | 'ND_LOGAND'
  | 'ND_LOGOR'
  | 'ND_EXCH';

interface ChibiccDumperBinaryNodeBase<
  K extends ChibiccDumperBinaryNodeKind,
> extends ChibiccDumperNodeBase<K> {
  /** Lhs Left-hand side operand. */
  readonly lhs: ChibiccDumperNode;
  /** Rhs Right-hand side operand. */
  readonly rhs: ChibiccDumperNode;
}

type ChibiccDumperUnaryNodeKind =
  | 'ND_NEG'
  | 'ND_ADDR'
  | 'ND_DEREF'
  | 'ND_NOT'
  | 'ND_BITNOT'
  | 'ND_EXPR_STMT';

interface ChibiccDumperUnaryNodeBase<
  K extends ChibiccDumperUnaryNodeKind,
> extends ChibiccDumperNodeBase<K> {
  /** Lhs Operand node. */
  readonly lhs: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_NULL_EXPR`.
 */
export interface ChibiccDumperNullExprNode extends ChibiccDumperNodeBase<'ND_NULL_EXPR'> {}

/**
 * Dumped AST node for `ND_ADD`.
 */
export interface ChibiccDumperAddNode extends ChibiccDumperBinaryNodeBase<'ND_ADD'> {}

/**
 * Dumped AST node for `ND_SUB`.
 */
export interface ChibiccDumperSubNode extends ChibiccDumperBinaryNodeBase<'ND_SUB'> {}

/**
 * Dumped AST node for `ND_MUL`.
 */
export interface ChibiccDumperMulNode extends ChibiccDumperBinaryNodeBase<'ND_MUL'> {}

/**
 * Dumped AST node for `ND_DIV`.
 */
export interface ChibiccDumperDivNode extends ChibiccDumperBinaryNodeBase<'ND_DIV'> {}

/**
 * Dumped AST node for `ND_NEG`.
 */
export interface ChibiccDumperNegNode extends ChibiccDumperUnaryNodeBase<'ND_NEG'> {}

/**
 * Dumped AST node for `ND_MOD`.
 */
export interface ChibiccDumperModNode extends ChibiccDumperBinaryNodeBase<'ND_MOD'> {}

/**
 * Dumped AST node for `ND_BITAND`.
 */
export interface ChibiccDumperBitAndNode extends ChibiccDumperBinaryNodeBase<'ND_BITAND'> {}

/**
 * Dumped AST node for `ND_BITOR`.
 */
export interface ChibiccDumperBitOrNode extends ChibiccDumperBinaryNodeBase<'ND_BITOR'> {}

/**
 * Dumped AST node for `ND_BITXOR`.
 */
export interface ChibiccDumperBitXorNode extends ChibiccDumperBinaryNodeBase<'ND_BITXOR'> {}

/**
 * Dumped AST node for `ND_SHL`.
 */
export interface ChibiccDumperShiftLeftNode extends ChibiccDumperBinaryNodeBase<'ND_SHL'> {}

/**
 * Dumped AST node for `ND_SHR`.
 */
export interface ChibiccDumperShiftRightNode extends ChibiccDumperBinaryNodeBase<'ND_SHR'> {}

/**
 * Dumped AST node for `ND_EQ`.
 */
export interface ChibiccDumperEqualNode extends ChibiccDumperBinaryNodeBase<'ND_EQ'> {}

/**
 * Dumped AST node for `ND_NE`.
 */
export interface ChibiccDumperNotEqualNode extends ChibiccDumperBinaryNodeBase<'ND_NE'> {}

/**
 * Dumped AST node for `ND_LT`.
 */
export interface ChibiccDumperLessThanNode extends ChibiccDumperBinaryNodeBase<'ND_LT'> {}

/**
 * Dumped AST node for `ND_LE`.
 */
export interface ChibiccDumperLessThanOrEqualNode extends ChibiccDumperBinaryNodeBase<'ND_LE'> {}

/**
 * Dumped AST node for `ND_ASSIGN`.
 */
export interface ChibiccDumperAssignNode extends ChibiccDumperBinaryNodeBase<'ND_ASSIGN'> {}

/**
 * Dumped AST node for `ND_COND`.
 */
export interface ChibiccDumperConditionalNode extends ChibiccDumperNodeBase<'ND_COND'> {
  /** Cond Condition expression. */
  readonly cond: ChibiccDumperNode;
  /** Then Expression evaluated when the condition is truthy. */
  readonly then: ChibiccDumperNode;
  /** Else Expression evaluated when the condition is falsy. */
  readonly else: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_COMMA`.
 */
export interface ChibiccDumperCommaNode extends ChibiccDumperBinaryNodeBase<'ND_COMMA'> {}

/**
 * Dumped AST node for `ND_MEMBER`.
 */
export interface ChibiccDumperMemberAccessNode extends ChibiccDumperNodeBase<'ND_MEMBER'> {
  /** Lhs Aggregate expression being accessed. */
  readonly lhs: ChibiccDumperNode;
  /** Member Selected member metadata. */
  readonly member: ChibiccDumperMember;
}

/**
 * Dumped AST node for `ND_ADDR`.
 */
export interface ChibiccDumperAddressNode extends ChibiccDumperUnaryNodeBase<'ND_ADDR'> {}

/**
 * Dumped AST node for `ND_DEREF`.
 */
export interface ChibiccDumperDereferenceNode extends ChibiccDumperUnaryNodeBase<'ND_DEREF'> {}

/**
 * Dumped AST node for `ND_NOT`.
 */
export interface ChibiccDumperLogicalNotNode extends ChibiccDumperUnaryNodeBase<'ND_NOT'> {}

/**
 * Dumped AST node for `ND_BITNOT`.
 */
export interface ChibiccDumperBitNotNode extends ChibiccDumperUnaryNodeBase<'ND_BITNOT'> {}

/**
 * Dumped AST node for `ND_LOGAND`.
 */
export interface ChibiccDumperLogicalAndNode extends ChibiccDumperBinaryNodeBase<'ND_LOGAND'> {}

/**
 * Dumped AST node for `ND_LOGOR`.
 */
export interface ChibiccDumperLogicalOrNode extends ChibiccDumperBinaryNodeBase<'ND_LOGOR'> {}

/**
 * Dumped AST node for `ND_RETURN`.
 */
export interface ChibiccDumperReturnNode extends ChibiccDumperNodeBase<'ND_RETURN'> {
  /** Lhs Returned expression, when one is present. */
  readonly lhs?: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_IF`.
 */
export interface ChibiccDumperIfNode extends ChibiccDumperNodeBase<'ND_IF'> {
  /** Cond Condition expression. */
  readonly cond: ChibiccDumperNode;
  /** Then Statement executed when the condition is truthy. */
  readonly then: ChibiccDumperNode;
  /** Else Statement executed when the condition is falsy, when present. */
  readonly else?: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_FOR`.
 */
export interface ChibiccDumperForNode extends ChibiccDumperNodeBase<'ND_FOR'> {
  /** Cond Loop continuation condition, when present. */
  readonly cond?: ChibiccDumperNode;
  /** Then Loop body statement. */
  readonly then: ChibiccDumperNode;
  /** Init Initialization statement or expression, when present. */
  readonly init?: ChibiccDumperNode;
  /** Inc Increment expression, when present. */
  readonly inc?: ChibiccDumperNode;
  /** BreakLabel Resolved jump label used by `break`. */
  readonly breakLabel: string;
  /** ContinueLabel Resolved jump label used by `continue`. */
  readonly continueLabel: string;
}

/**
 * Dumped AST node for `ND_DO`.
 */
export interface ChibiccDumperDoNode extends ChibiccDumperNodeBase<'ND_DO'> {
  /** Cond Loop continuation condition. */
  readonly cond: ChibiccDumperNode;
  /** Then Loop body statement. */
  readonly then: ChibiccDumperNode;
  /** BreakLabel Resolved jump label used by `break`. */
  readonly breakLabel: string;
  /** ContinueLabel Resolved jump label used by `continue`. */
  readonly continueLabel: string;
}

/**
 * Dumped AST node for `ND_SWITCH`.
 */
export interface ChibiccDumperSwitchNode extends ChibiccDumperNodeBase<'ND_SWITCH'> {
  /** Cond Controlling expression. */
  readonly cond: ChibiccDumperNode;
  /** Then Switch body statement. */
  readonly then: ChibiccDumperNode;
  /** BreakLabel Resolved jump label used by `break`. */
  readonly breakLabel: string;
}

/**
 * Dumped AST node for `ND_CASE`.
 */
export interface ChibiccDumperCaseNode extends ChibiccDumperNodeBase<'ND_CASE'> {
  /** Lhs Statement associated with the case label. */
  readonly lhs: ChibiccDumperNode;
  /** Label Resolved internal label name. */
  readonly label: string;
  /** Begin Inclusive starting value for the case range. */
  readonly begin: number;
  /** End Inclusive ending value for the case range. */
  readonly end: number;
}

/**
 * Dumped AST node for `ND_BLOCK`.
 */
export interface ChibiccDumperBlockNode extends ChibiccDumperNodeBase<'ND_BLOCK'> {
  /** Body Statements contained in the block. */
  readonly body: readonly ChibiccDumperNode[];
}

/**
 * Dumped AST node for `ND_GOTO`.
 */
export interface ChibiccDumperGotoNode extends ChibiccDumperNodeBase<'ND_GOTO'> {
  /** Label Source label name, when the goto names one directly. */
  readonly label?: string;
  /** UniqueLabel Resolved internal label name. */
  readonly uniqueLabel: string;
}

/**
 * Dumped AST node for `ND_GOTO_EXPR`.
 */
export interface ChibiccDumperGotoExprNode extends ChibiccDumperNodeBase<'ND_GOTO_EXPR'> {
  /** Lhs Expression that yields the destination label address. */
  readonly lhs: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_LABEL`.
 */
export interface ChibiccDumperLabelNode extends ChibiccDumperNodeBase<'ND_LABEL'> {
  /** Lhs Statement attached to the label. */
  readonly lhs: ChibiccDumperNode;
  /** Label Source label name. */
  readonly label: string;
  /** UniqueLabel Resolved internal label name. */
  readonly uniqueLabel: string;
}

/**
 * Dumped AST node for `ND_LABEL_VAL`.
 */
export interface ChibiccDumperLabelValueNode extends ChibiccDumperNodeBase<'ND_LABEL_VAL'> {
  /** Label Source label name. */
  readonly label: string;
  /** UniqueLabel Resolved internal label name. */
  readonly uniqueLabel: string;
}

/**
 * Dumped AST node for `ND_FUNCALL`.
 */
export interface ChibiccDumperFunctionCallNode extends ChibiccDumperNodeBase<'ND_FUNCALL'> {
  /** Lhs Callee expression. */
  readonly lhs: ChibiccDumperNode;
  /** Args Argument expressions in call order. */
  readonly args: readonly ChibiccDumperNode[];
  /** FuncTypeId Referenced function type identifier. */
  readonly funcTypeId: number;
  /** PassByStack Whether the call uses stack-based aggregate passing. */
  readonly passByStack?: boolean;
  /** RetBuffer Hidden return buffer variable for aggregate returns, when used. */
  readonly retBuffer?: ChibiccDumperVariableRef;
}

/**
 * Dumped AST node for `ND_EXPR_STMT`.
 */
export interface ChibiccDumperExpressionStatementNode extends ChibiccDumperUnaryNodeBase<'ND_EXPR_STMT'> {}

/**
 * Dumped AST node for `ND_STMT_EXPR`.
 */
export interface ChibiccDumperStatementExpressionNode extends ChibiccDumperNodeBase<'ND_STMT_EXPR'> {
  /** Body Statements contained in the GNU statement expression. */
  readonly body: readonly ChibiccDumperNode[];
}

/**
 * Dumped AST node for `ND_VAR`.
 */
export interface ChibiccDumperVariableNode extends ChibiccDumperNodeBase<'ND_VAR'> {
  /** Var Referenced variable metadata. */
  readonly var: ChibiccDumperVariableRef;
}

/**
 * Dumped AST node for `ND_VLA_PTR`.
 */
export interface ChibiccDumperVariableLengthArrayPointerNode extends ChibiccDumperNodeBase<'ND_VLA_PTR'> {
  /** Var Referenced hidden VLA pointer variable metadata. */
  readonly var: ChibiccDumperVariableRef;
}

/**
 * Dumped AST node for `ND_NUM`.
 */
export interface ChibiccDumperNumberNode extends ChibiccDumperNodeBase<'ND_NUM'> {
  /** Value Integer literal value, when the literal is integral. */
  readonly value?: number;
  /** Fvalue Decimal string value, when the literal is floating-point. */
  readonly fvalue?: string;
}

/**
 * Dumped AST node for `ND_CAST`.
 */
export interface ChibiccDumperCastNode extends ChibiccDumperNodeBase<'ND_CAST'> {
  /** Lhs Expression being cast. */
  readonly lhs: ChibiccDumperNode;
  /** TypeId Referenced destination type identifier. */
  readonly typeId: number;
}

/**
 * Dumped AST node for `ND_MEMZERO`.
 */
export interface ChibiccDumperMemzeroNode extends ChibiccDumperNodeBase<'ND_MEMZERO'> {
  /** Var Target variable metadata. */
  readonly var: ChibiccDumperVariableRef;
}

/**
 * Dumped AST node for `ND_ASM`.
 */
export interface ChibiccDumperAsmNode extends ChibiccDumperNodeBase<'ND_ASM'> {
  /** Asm Inline assembly string literal contents. */
  readonly asm: string;
}

/**
 * Dumped AST node for `ND_CAS`.
 */
export interface ChibiccDumperCompareAndSwapNode extends ChibiccDumperNodeBase<'ND_CAS'> {
  /** CasAddr Address expression of the target object. */
  readonly casAddr: ChibiccDumperNode;
  /** CasOld Expression yielding the expected old value pointer. */
  readonly casOld: ChibiccDumperNode;
  /** CasNew Expression yielding the replacement value. */
  readonly casNew: ChibiccDumperNode;
}

/**
 * Dumped AST node for `ND_EXCH`.
 */
export interface ChibiccDumperExchangeNode extends ChibiccDumperBinaryNodeBase<'ND_EXCH'> {}

/**
 * Union of all dumped AST node interfaces.
 */
export type ChibiccDumperNode =
  | ChibiccDumperNullExprNode
  | ChibiccDumperAddNode
  | ChibiccDumperSubNode
  | ChibiccDumperMulNode
  | ChibiccDumperDivNode
  | ChibiccDumperNegNode
  | ChibiccDumperModNode
  | ChibiccDumperBitAndNode
  | ChibiccDumperBitOrNode
  | ChibiccDumperBitXorNode
  | ChibiccDumperShiftLeftNode
  | ChibiccDumperShiftRightNode
  | ChibiccDumperEqualNode
  | ChibiccDumperNotEqualNode
  | ChibiccDumperLessThanNode
  | ChibiccDumperLessThanOrEqualNode
  | ChibiccDumperAssignNode
  | ChibiccDumperConditionalNode
  | ChibiccDumperCommaNode
  | ChibiccDumperMemberAccessNode
  | ChibiccDumperAddressNode
  | ChibiccDumperDereferenceNode
  | ChibiccDumperLogicalNotNode
  | ChibiccDumperBitNotNode
  | ChibiccDumperLogicalAndNode
  | ChibiccDumperLogicalOrNode
  | ChibiccDumperReturnNode
  | ChibiccDumperIfNode
  | ChibiccDumperForNode
  | ChibiccDumperDoNode
  | ChibiccDumperSwitchNode
  | ChibiccDumperCaseNode
  | ChibiccDumperBlockNode
  | ChibiccDumperGotoNode
  | ChibiccDumperGotoExprNode
  | ChibiccDumperLabelNode
  | ChibiccDumperLabelValueNode
  | ChibiccDumperFunctionCallNode
  | ChibiccDumperExpressionStatementNode
  | ChibiccDumperStatementExpressionNode
  | ChibiccDumperVariableNode
  | ChibiccDumperVariableLengthArrayPointerNode
  | ChibiccDumperNumberNode
  | ChibiccDumperCastNode
  | ChibiccDumperMemzeroNode
  | ChibiccDumperAsmNode
  | ChibiccDumperCompareAndSwapNode
  | ChibiccDumperExchangeNode;

/**
 * Parsed scope entry emitted by the JSON dumper.
 */
export interface ChibiccDumperScope {
  /** Id Stable scope identifier in one dump. */
  readonly id: number;
  /** ParentScopeId Parent scope identifier, or `null` for the root. */
  readonly parentScopeId: number | null;
  /** Kind Scope kind. */
  readonly kind: ChibiccDumperScopeKind;
}

/**
 * Parsed typedef entry emitted by the JSON dumper.
 */
export interface ChibiccDumperTypedef {
  /** Name Typedef alias name. */
  readonly name: string;
  /** TypeId Resolved aliased type identifier. */
  readonly typeId: number;
  /** ScopeId Owning scope identifier. */
  readonly scopeId: number;
  /** Token Representative source token. */
  readonly token: ChibiccDumperTokenRef;
}

/**
 * Parsed tag entry emitted by the JSON dumper.
 */
export interface ChibiccDumperTag {
  /** Name Tag name. */
  readonly name: string;
  /** TypeId Tagged type identifier. */
  readonly typeId: number;
  /** ScopeId Owning scope identifier. */
  readonly scopeId: number;
  /** Token Representative source token. */
  readonly token: ChibiccDumperTokenRef;
  /** IsDefinition Whether the tag is a defining declaration. */
  readonly isDefinition: boolean;
}

interface ChibiccDumperObjectBase {
  /** Name Object name. */
  readonly name: string;
  /** TypeId Referenced type identifier. */
  readonly typeId: number;
  /** Align Alignment requirement in bytes. */
  readonly align: number;
  /** IsLocal Whether the object belongs to local storage. */
  readonly isLocal: boolean;
  /** IsFunction Whether the object is a function. */
  readonly isFunction: boolean;
  /** IsDefinition Whether the declaration is a definition. */
  readonly isDefinition: boolean;
  /** IsStatic Whether the object has internal linkage. */
  readonly isStatic: boolean;
  /** IsTentative Whether the declaration is tentative. */
  readonly isTentative: boolean;
  /** IsTls Whether the object is thread-local. */
  readonly isTls: boolean;
  /** Token Representative source token, when available. */
  readonly token?: ChibiccDumperTokenRef;
}

/**
 * Shallow local object entry used for function params and locals.
 */
export interface ChibiccDumperLocalObject extends ChibiccDumperObjectBase {
  /** IsFunction Always `false` for local objects. */
  readonly isFunction: false;
}

/**
 * Full global or static variable entry emitted in `ast.globals`.
 */
export interface ChibiccDumperVariableObject extends ChibiccDumperObjectBase {
  /** IsFunction Always `false` for non-function objects. */
  readonly isFunction: false;
  /** HeaderComments Header comments attached to the declaration. */
  readonly headerComments?: readonly ChibiccDumperHeaderComment[];
  /** InitDataBytes Initializer bytes when the object has static data. */
  readonly initDataBytes?: readonly number[];
  /** Relocations Relocation entries for pointer-valued initializers. */
  readonly relocations?: readonly ChibiccDumperRelocation[];
}

/**
 * Full function entry emitted in `ast.globals`.
 */
export interface ChibiccDumperFunctionObject extends ChibiccDumperObjectBase {
  /** IsFunction Always `true` for function objects. */
  readonly isFunction: true;
  /** HeaderComments Header comments attached to the declaration. */
  readonly headerComments?: readonly ChibiccDumperHeaderComment[];
  /** IsInline Whether the function is declared `inline`. */
  readonly isInline: boolean;
  /** IsLive Whether the parser marked the function as live. */
  readonly isLive: boolean;
  /** IsRoot Whether the function is a root entry for reachability. */
  readonly isRoot: boolean;
  /** Params Parameter objects in declaration order. */
  readonly params: readonly ChibiccDumperLocalObject[];
  /** Locals Local objects belonging to the function. */
  readonly locals: readonly ChibiccDumperLocalObject[];
  /** Body Function body block. */
  readonly body: ChibiccDumperBlockNode;
}

/**
 * Union of full top-level object entries.
 */
export type ChibiccDumperObject =
  | ChibiccDumperVariableObject
  | ChibiccDumperFunctionObject;

/**
 * AST root object emitted when `dumpAst` is enabled.
 */
export interface ChibiccDumperProgram {
  /** Kind Constant root marker. */
  readonly kind: 'program';
  /** Globals Top-level object entries. */
  readonly globals: readonly ChibiccDumperObject[];
}

interface ChibiccDumperResultBase {
  /** Types Collected type table for the dump result. */
  readonly types: readonly ChibiccDumperType[];
}

/**
 * Result shape when only token dumping is enabled.
 */
export interface ChibiccDumperTokensOnlyResult extends ChibiccDumperResultBase {
  /** Tokens Dumped raw token stream. */
  readonly tokens: readonly ChibiccDumperToken[];
  /** Ast Absent in token-only mode. */
  readonly ast?: never;
  /** Scopes Absent in token-only mode. */
  readonly scopes?: never;
  /** Tags Absent in token-only mode. */
  readonly tags?: never;
  /** Typedefs Absent in token-only mode. */
  readonly typedefs?: never;
}

/**
 * Result shape when only AST dumping is enabled.
 */
export interface ChibiccDumperAstOnlyResult extends ChibiccDumperResultBase {
  /** Tokens Absent in AST-only mode. */
  readonly tokens?: never;
  /** Ast Dumped AST root object. */
  readonly ast: ChibiccDumperProgram;
  /** Scopes Captured parse-time scope metadata. */
  readonly scopes: readonly ChibiccDumperScope[];
  /** Tags Captured parse-time tag metadata. */
  readonly tags: readonly ChibiccDumperTag[];
  /** Typedefs Captured parse-time typedef metadata. */
  readonly typedefs: readonly ChibiccDumperTypedef[];
}

/**
 * Result shape when both token and AST dumping are enabled.
 */
export interface ChibiccDumperFullDumpResult extends ChibiccDumperResultBase {
  /** Tokens Dumped raw token stream. */
  readonly tokens: readonly ChibiccDumperToken[];
  /** Ast Dumped AST root object. */
  readonly ast: ChibiccDumperProgram;
  /** Scopes Captured parse-time scope metadata. */
  readonly scopes: readonly ChibiccDumperScope[];
  /** Tags Captured parse-time tag metadata. */
  readonly tags: readonly ChibiccDumperTag[];
  /** Typedefs Captured parse-time typedef metadata. */
  readonly typedefs: readonly ChibiccDumperTypedef[];
}

/**
 * Union of all dump result shapes.
 */
export type ChibiccDumperDumpResult =
  | ChibiccDumperTokensOnlyResult
  | ChibiccDumperAstOnlyResult
  | ChibiccDumperFullDumpResult;

/**
 * Extracts the token interface that corresponds to one token kind.
 */
export type ChibiccDumperTokenOfKind<K extends ChibiccDumperTokenKind> =
  Extract<ChibiccDumperToken, { readonly kind: K }>;

/**
 * Extracts the type interface that corresponds to one type kind.
 */
export type ChibiccDumperTypeOfKind<K extends ChibiccDumperTypeKind> = Extract<
  ChibiccDumperType,
  { readonly kind: K }
>;

/**
 * Extracts the node interface that corresponds to one node kind.
 */
export type ChibiccDumperNodeOfKind<K extends ChibiccDumperNodeKind> = Extract<
  ChibiccDumperNode,
  { readonly kind: K }
>;
