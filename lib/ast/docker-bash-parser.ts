// import * as sh2 from "sh-syntax";
import sh, { LangVariant } from "mvdan-sh";
const { syntax } = sh;
import { type } from "os";
import * as bashAST from "./mvdan-sh-types";

import {
  BashArithmeticBinary,
  BashArithmeticBinaryLhs,
  BashArithmeticBinaryOp,
  BashArithmeticBinaryRhs,
  BashArray,
  BashAssign,
  BashAssignLhs,
  BashAssignRhs,
  BashCaseExpCase,
  BashCaseExpCases,
  BashCaseExpression,
  BashCaseExpressions,
  BashCaseExpTarget,
  BashCaseKind,
  BashCaseLabels,
  BashCommandArgs,
  BashCommandCommand,
  BashCommandPrefix,
  BashConditionBinary,
  BashConditionBinaryLhs,
  BashConditionBinaryOp,
  BashConditionBinaryRhs,
  BashConditionUnary,
  BashConditionUnaryOp,
  BashConditionUnaryExp,
  BashDollarParens,
  BashDoubleQuoted,
  BashForIn,
  BashForInBody,
  BashFunction,
  BashIfCondition,
  BashIfElse,
  BashIfExpression,
  BashIfThen,
  BashLiteral,
  BashOp,
  BashPath,
  BashRedirect,
  BashRedirectAppend,
  BashRedirectOverwrite,
  BashRedirectRedirects,
  BashRedirectStderr,
  BashScript,
  BashSingleQuoted,
  BashSubshell,
  BashVariable,
  BashWhileExpression,
  BashWord,
  DockerOpsNodeType,
  MaybeSemanticCommand,
  Unknown,
  BashFunctionName,
  BashFunctionBody,
  BashForInVariable,
  BashForInItems,
  Position,
  BashComment,
  BashBraceGroup,
  BashBraceExpansion,
  BashRedirectStdin,
  BashProcSubOp,
  BashProcSub,
  BashProcSubBody,
  BashConditionOp,
  BashUntilBody,
  BashUntilCondition,
  BashReplace,
  BashDollarBrace,
  BashArithmeticExpression,
} from "./docker-type";
import File from "./file";

export class ShellParser {
  readonly errors = [];

  constructor(
    readonly shString: string,
    readonly originalPosition: Position = new Position(0, 0)
  ) {}

  private pos(node: bashAST.Node[] | bashAST.Node | bashAST.Pos): Position {
    if (Array.isArray(node)) {
      if (node.length == 0) {
        return null;
      }
      const p = new Position(
        node[0].Pos().Line() - 1 + this.originalPosition.lineStart,
        node[0].Pos().Col() - 1,
        node[node.length - 1].End().Line() -
          1 +
          this.originalPosition.lineStart,
        node[node.length - 1].End().Col() - 1
      );
      p.file = this.originalPosition.file;
      return p;
    } else if ((node as bashAST.Node).Pos !== undefined) {
      const n: bashAST.Node = node as bashAST.Node;

      const lineStart = n.Pos().Line() - 1 + this.originalPosition.lineStart;
      const lineEnd = n.End().Line() - 1 + this.originalPosition.lineStart;
      let columnStart = n.Pos().Col() - 1;
      if (lineStart == this.originalPosition.lineStart) {
        columnStart += this.originalPosition.columnStart;
      }
      let columnEnd = n.End().Col() - 1;
      if (lineEnd == this.originalPosition.lineStart) {
        columnEnd += this.originalPosition.columnStart;
      }

      const p = new Position(lineStart, columnStart, lineEnd, columnEnd);
      p.file = this.originalPosition.file;
      return p;
    }

    const p: bashAST.Pos = node as bashAST.Pos;

    const lineStart = p.Line() - 1 + this.originalPosition.lineStart;
    let columnStart = p.Col() - 1;
    if (lineStart == this.originalPosition.lineStart) {
      columnStart += this.originalPosition.columnStart;
    }

    const out = new Position(lineStart, columnStart, lineStart);
    out.file = this.originalPosition.file;
    return out;
  }

  private handleNodes(node: bashAST.Node[], current: DockerOpsNodeType) {
    for (const child of node) {
      current.addChild(this.handleNode(child));
    }
    return current;
  }

  private handleNode(
    node: bashAST.Node
  ): DockerOpsNodeType | DockerOpsNodeType[] {
    if (node == null) {
      throw new Error("node is null");
    }
    if (!node.$type) {
      throw new Error("node type now found: " + node);
    }
    const nodeType: string = (node as any).$type.split("*").at(-1);
    switch (nodeType) {
      case "ArithmCmd":
        const ArithmCmd = node as bashAST.ArithmCmd;
        return this.handleNode(ArithmCmd.X);
      case "ArithmExp":
        const ArithmExp = node as bashAST.ArithmExp;
        const bab = new BashArithmeticExpression()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(ArithmExp.X));
        bab.bracket = ArithmExp.Bracket;
        return bab;
      case "ArithmExpr":
        const ArithmExpr = node as bashAST.ArithmExpr;
        return this.handleNode(ArithmExpr.Node);
      case "ArrayExpr":
        const ArrayExpr = node as bashAST.ArrayExpr;
        const arr = new BashArray().setPosition(this.pos(node));
        for (const elem of ArrayExpr.Elems) {
          arr.addChild(this.handleNode(elem));
        }
        return arr;
      case "Assign":
        const Assign = node as bashAST.Assign;
        const ass = new BashAssign()
          .setPosition(this.pos(node))
          .addChild(
            new BashAssignLhs().addChild(
              new BashVariable(Assign.Name.Value).setPosition(
                this.pos(Assign.Name)
              )
            )
          );
        if (Assign.Value) {
          ass.addChild(
            new BashAssignRhs()
              .setPosition(this.pos(Assign.Value))
              .addChild(this.handleNode(Assign.Value))
          );
        }
        return ass;
      case "BinAritOperator":
        const BinAritOperator = node as bashAST.BinAritOperator;
        return new BashOp(BinAritOperator.String()).setPosition(this.pos(node));

      case "BinaryArithm":
        const BinaryArithm = node as bashAST.BinaryArithm;
        const ba = new BashArithmeticBinary()
          .setPosition(this.pos(node))
          .addChild(
            new BashArithmeticBinaryOp()
              .setPosition(this.pos(BinaryArithm.OpPos))
              .addChild(
                new BashOp(BinaryArithm.Op.toString()).setPosition(
                  this.pos(BinaryArithm.OpPos)
                )
              )
          )
          .addChild(
            new BashArithmeticBinaryLhs()
              .setPosition(this.pos(BinaryArithm.X))
              .addChild(this.handleNode(BinaryArithm.X))
          )
          .addChild(
            new BashArithmeticBinaryRhs()
              .setPosition(this.pos(BinaryArithm.Y))
              .addChild(this.handleNode(BinaryArithm.Y))
          );
        return ba;
      case "BinaryCmd":
        const BinaryCmd = node as bashAST.BinaryCmd;
        const bashConditionBinary = new BashConditionBinary()
          .setPosition(this.pos(node))
          .addChild(
            new BashConditionBinaryOp()
              .setPosition(this.pos(BinaryCmd.OpPos))
              .addChild(
                new BashOp(BinaryCmd.Op + "").setPosition(
                  this.pos(BinaryCmd.OpPos)
                )
              )
          )
          .addChild(
            new BashConditionBinaryLhs()
              .setPosition(this.pos(BinaryCmd.X))
              .addChild(this.handleNode(BinaryCmd.X))
          )
          .addChild(
            new BashConditionBinaryRhs()
              .setPosition(this.pos(BinaryCmd.Y))
              .addChild(this.handleNode(BinaryCmd.Y))
          );
        // identify comments that are in the wrong part of the operator
        bashConditionBinary.right
          .getElements(BashComment)
          .filter(
            (c) =>
              c.position.lineStart < bashConditionBinary.op.position.lineStart
          )
          .forEach((c) => {
            c.remove();
            bashConditionBinary.left.addChild(c);
          });
        return bashConditionBinary;
      case "Block":
        const Block = node as bashAST.Block;
        return Block.Stmts.map((e) =>
          this.handleNode(e)
        ) as DockerOpsNodeType[];
      case "CallExpr":
        const CallExpr = node as bashAST.CallExpr;
        const cmd = new MaybeSemanticCommand().setPosition(this.pos(node));
        for (let i = 0; i < CallExpr.Assigns.length; i++) {
          const arg = CallExpr.Assigns[i];
          cmd.addChild(
            new BashCommandPrefix()
              .setPosition(this.pos(arg))
              .addChild(this.handleNode(arg))
          );
        }
        if (CallExpr.Args.length > 0) {
          cmd.addChild(
            new BashCommandCommand()
              .setPosition(this.pos(CallExpr.Args[0]))
              .addChild(this.handleNode(CallExpr.Args[0]))
          );
          for (let i = 1; i < CallExpr.Args.length; i++) {
            const arg = CallExpr.Args[i];
            cmd.addChild(
              new BashCommandArgs()
                .setPosition(this.pos(arg))
                .addChild(this.handleNode(arg))
            );
          }
        }
        return cmd;
      case "CaseClause":
        const CaseClause = node as bashAST.CaseClause;
        const bce = new BashCaseExpression().setPosition(this.pos(node));
        bce.hasBraces = CaseClause.Braces;
        return bce
          .addChild(
            new BashCaseExpTarget()
              .setPosition(this.pos(CaseClause.Word))
              .addChild(this.handleNode(CaseClause.Word))
          )
          .addChild(
            this.handleNodes(
              CaseClause.Items,
              new BashCaseExpCases().setPosition(this.pos(CaseClause.Items))
            )
          );
      case "CaseItem":
        const CaseItem = node as bashAST.CaseItem;
        return new BashCaseExpCase()
          .setPosition(this.pos(node))
          .addChild(
            new BashCaseKind(CaseItem.Op + "").setPosition(
              this.pos(CaseItem.OpPos)
            )
          )
          .addChild(
            this.handleNodes(
              CaseItem.Patterns,
              new BashCaseLabels().setPosition(this.pos(CaseItem.Patterns))
            )
          )
          .addChild(
            this.handleNodes(
              CaseItem.Stmts,
              new BashCaseExpressions().setPosition(this.pos(CaseItem.Stmts))
            )
          );
      case "CmdSubst":
        const CmdSubst = node as bashAST.CmdSubst;
        return this.handleNodes(
          CmdSubst.Stmts,
          new BashDollarParens().setPosition(this.pos(node))
        );
      case "Command":
        const Command = node as bashAST.Command;
        const bCmd = new MaybeSemanticCommand()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(Command.Node));
        return bCmd;
      case "Comment":
        const Comment = node as bashAST.Comment;
        return new BashComment(
          Comment.Text.trimEnd()
            // remove the \ that has been added at the end of the line
            .replace(/(.*)\\$/g, "$1")
            .trimEnd()
        ).setPosition(this.pos(node));

      case "DblQuoted":
        const DblQuoted = node as bashAST.DblQuoted;
        const bDQ = new BashDoubleQuoted().setPosition(this.pos(node));
        DblQuoted.Parts.forEach((part) => {
          bDQ.addChild(this.handleNode(part));
        });
        return bDQ;

      case "File":
        return this.handleNodes(
          (node as bashAST.File).Stmts,
          new BashScript().setPosition(this.pos(node))
        );
      case "ForClause":
        const ForClause = node as bashAST.ForClause;
        const loop = this.handleNode(ForClause.Loop) as BashWord;

        return new BashForIn()
          .setPosition(this.pos(node))
          .addChild(new BashForInVariable().addChild(loop.variable))
          .addChild(new BashForInItems().addChild(loop.items))
          .addChild(
            this.handleNodes(
              ForClause.Do,
              new BashForInBody().setPosition(this.pos(ForClause.DoPos))
            )
          );
      case "FuncDecl":
        const FuncDecl = node as bashAST.FuncDecl;
        return new BashFunction()
          .setPosition(this.pos(node))
          .addChild(
            new BashFunctionName()
              .setPosition(this.pos(FuncDecl.Name))
              .addChild(this.handleNode(FuncDecl.Name))
          )
          .addChild(
            new BashFunctionBody()
              .setPosition(this.pos(FuncDecl.Body))
              .addChild(this.handleNode(FuncDecl.Body))
          );

      case "IfClause":
        const IfClause = node as bashAST.IfClause;
        const bIf = new BashIfExpression().setPosition(this.pos(node));
        bIf
          .addChild(
            this.handleNodes(
              IfClause.Cond,
              new BashIfCondition().setPosition(this.pos(IfClause.Position))
            )
          )
          .addChild(
            this.handleNodes(
              IfClause.Then,
              new BashIfThen().setPosition(this.pos(IfClause.ThenPos))
            )
          );
        if (IfClause.Else) {
          bIf.addChild(
            new BashIfElse()
              .setPosition(this.pos(IfClause.Else))
              .addChild(this.handleNode(IfClause.Else))
          );
        }
        return bIf;

      case "Lit":
        const Lit = node as bashAST.Lit;
        return new BashLiteral(Lit.Value).setPosition(this.pos(node));
      case "Loop":
        const Loop = node as bashAST.Loop;
        return this.handleNode(Loop.Node);

      case "ParamExp":
        const ParamExp = node as bashAST.ParamExp;
        const dollar = new BashDollarBrace()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(ParamExp.Param));
        dollar.short = ParamExp.Short;
        if (ParamExp.Slice) {
          ParamExp.Slice.Offset;
          dollar.addChild(this.handleNode(ParamExp.Slice));
        }
        if (ParamExp.Repl) {
          dollar.addChild(this.handleNode(ParamExp.Repl));
        }
        if (ParamExp.Exp) {
          dollar.addChild(this.handleNode(ParamExp.Exp));
        }
        return dollar;

      case "Redirect":
        const Redirect = node as bashAST.Redirect;
        const out = new BashRedirectRedirects().setPosition(this.pos(node));
        let op: DockerOpsNodeType;
        if (Redirect.Op === 54) {
          // >
          op = new BashRedirectOverwrite();
        } else if (Redirect.Op === 59) {
          // 2>
          op = new BashRedirectStderr();
        } else if (Redirect.Op === 55) {
          // >>
          op = new BashRedirectAppend();
        } else if (Redirect.Op === 56) {
          // <
          op = new BashRedirectStdin();
        } else {
          const error = new Error("Unknown redirect kind " + Redirect.Op);
          (error as any).node = node;
          this.errors.push(error);
          op = new BashRedirectAppend();
        }
        op.setPosition(this.pos(Redirect.OpPos)).addChild(
          new BashPath()
            .setPosition(this.pos(Redirect.Word))
            .addChild(this.handleNode(Redirect.Word))
        );
        if (Redirect.N) {
          op.addChild(this.handleNode(Redirect.N));
        }
        if (Redirect.Hdoc) {
          op.addChild(this.handleNode(Redirect.Hdoc));
        }
        out.addChild(op);
        return new BashRedirect().setPosition(this.pos(node)).addChild(out);
      case "SglQuoted":
        const SglQuoted = node as bashAST.SglQuoted;
        return new BashSingleQuoted(SglQuoted.Value).setPosition(
          this.pos(node)
        );
      case "Stmt":
        const Stmt = node as bashAST.Stmt;
        const redirects = Stmt.Redirs.map((e) =>
          this.handleNode(e)
        ) as DockerOpsNodeType[];

        if (!Stmt.Cmd) {
          return redirects;
        }

        let cmdStmt = this.handleNode(Stmt.Cmd) as MaybeSemanticCommand;
        if (Array.isArray(cmdStmt)) {
          const tmp = new MaybeSemanticCommand()
            .setPosition(this.pos(node))
            .addChild(new BashBraceGroup().setPosition(this.pos(node)));
          cmdStmt.map((i) => tmp.children[0].addChild(i));
          cmdStmt = tmp;
        }
        if (cmdStmt == null) throw new Error("CMD cannot be null");
        if (redirects.length > 0) cmdStmt.addChild(redirects);

        cmdStmt.semicolon =
          Stmt.Semicolon.Line() > 0 && Stmt.Semicolon.Col() > 0;
        cmdStmt.isBackground = Stmt.Background;
        cmdStmt.isCoprocess = Stmt.Coprocess;
        cmdStmt.isNegated = Stmt.Negated;

        this.handleNodes(Stmt.Comments, cmdStmt);

        return cmdStmt;
      case "StmtList":
        const StmtList = node as bashAST.StmtList;
        const bS = new BashScript().setPosition(this.pos(node));
        for (const child of StmtList.Stmts) {
          if (child != null) bS.addChild(this.handleNode(child));
        }
        return bS;
      case "Subshell":
        const Subshell = node as bashAST.Subshell;
        return this.handleNodes(
          Subshell.Stmts,
          new BashSubshell().setPosition(this.pos(node))
        );
      case "UnAritOperator":
        const UnAritOperator = node as bashAST.UnAritOperator;
        return new BashOp(UnAritOperator.String()).setPosition(this.pos(node));
      case "WhileClause":
        const WhileClause = node as bashAST.WhileClause;
        const whileE = new BashWhileExpression().setPosition(this.pos(node));
        whileE
          .addChild(
            this.handleNodes(
              WhileClause.Cond,
              new BashUntilCondition().setPosition(
                this.pos(WhileClause.WhilePos)
              )
            )
          )
          .addChild(
            this.handleNodes(
              WhileClause.Do,
              new BashUntilBody().setPosition(this.pos(WhileClause.DoPos))
            )
          );
        return whileE;
      case "Word":
        const Word = node as bashAST.Word;
        // const bL = new BashLiteral(Word.Lit());
        const bW = new BashWord().setPosition(this.pos(node));
        // if (bL.value != "") bW.addChild(bL);
        for (let part of Word.Parts) {
          bW.addChild(this.handleNode(part));
        }
        return bW;
      case "WordIter":
        const WordIter = node as bashAST.WordIter;

        const bV = new BashVariable(WordIter.Name.Value).setPosition(
          this.pos(WordIter.Name)
        );
        const bWW = new BashWord().setPosition(this.pos(node));
        if (bV.value != "") bWW.addChild(bV);
        for (let part of WordIter.Items) {
          bWW.addChild(this.handleNode(part));
        }
        return bWW;
      case "WordPart":
        const WordPart = node as bashAST.WordPart;
        return this.handleNode(WordPart.Node);
      case "Expansion":
        const Expansion = node as bashAST.Expansion;
        const expansion = new BashBraceExpansion(Expansion.Op.toString());
        if (Expansion.Word) {
          expansion.addChild(this.handleNode(Expansion.Word));
        }
        return expansion;
      case "Darwin":
        console.log(node);
        break;
      case "ProcSubst":
        const ProcSubst = node as bashAST.ProcSubst;
        const o = new BashProcSub()
          .setPosition(this.pos(node))
          .addChild(
            new BashProcSubOp(ProcSubst.Op.toString()).setPosition(
              this.pos(ProcSubst.OpPos)
            )
          )
          .addChild(
            new BashProcSubBody().setPosition(this.pos(ProcSubst.Rparen))
          );
        this.handleNodes(ProcSubst.Stmts, o.getElement(BashProcSubBody));
        return o;
      case "Slice":
        const Slice = node as bashAST.Slice;
        if (Slice.Length) {
          return this.handleNode(Slice.Length);
        } else {
          return this.handleNode(Slice.Offset);
        }
      case "UnaryArithm":
        const UnaryArithm = node as bashAST.UnaryArithm;
        const BCU = new BashConditionOp(UnaryArithm.Op.toString())
          .setPosition(this.pos(node))
          .addChild(this.handleNode(UnaryArithm.X));
        return BCU;
      case "Replace":
        const Replace = node as bashAST.Replace;
        return new BashReplace()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(Replace.Orig))
          .addChild(this.handleNode(Replace.With));
      case "ParExpOperator":
        const ParExpOperator = node as bashAST.ParExpOperator;
      case "ParNamesOperator":
        const ParNamesOperator = node as bashAST.ParNamesOperator;
      case "TestClause":
        const TestClause = node as bashAST.TestClause;
      case "TestExpr":
        const TestExpr = node as bashAST.TestExpr;
      case "TimeClause":
        const TimeClause = node as bashAST.TimeClause;
      case "ParenArithm":
        const ParenArithm = node as bashAST.ParenArithm;
      case "ParenTest":
        const ParenTest = node as bashAST.ParenTest;
      case "LetClause":
        const LetClause = node as bashAST.LetClause;
      case "GlobOperator":
        const GlobOperator = node as bashAST.GlobOperator;
      case "DeclClause":
        const DeclClause = node as bashAST.DeclClause;
      case "ExtGlob":
        const ExtGlob = node as bashAST.ExtGlob;
      case "CoprocClause":
        const CoprocClause = node as bashAST.CoprocClause;
      case "BinaryTest":
        const BinaryTest = node as bashAST.BinaryTest;
      case "BinCmdOperator":
        const BinCmdOperator = node as bashAST.BinCmdOperator;
      case "ArrayElem":
        const ArrayElem = node as bashAST.ArrayElem;
      case "BinTestOperator":
        const BinTestOperator = node as bashAST.BinTestOperator;
      case "CStyleLoop":
        const CStyleLoop = node as bashAST.CStyleLoop;
      case "UnTestOperator":
        const UnTestOperator = node as bashAST.UnTestOperator;
      case "UnaryTest":
        const UnaryTest = node as bashAST.UnaryTest;
    }
    const e = new Error(`Unhandled bash type: ${type}`);
    (e as any).node = node;
    this.errors.push(e);
    return new Unknown().addChild(new BashLiteral(nodeType));
  }

  async parse(
    variant: LangVariant = syntax.LangPOSIX
  ): Promise<DockerOpsNodeType> {
    const parser: bashAST.Parser = syntax.NewParser(
      syntax.KeepComments(true),
      syntax.Variant(variant)
    ) as any;

    try {
      const result = parser.Parse(this.shString, "src.sh");
      // const result2 = await sh2.parse(this.shString, {
      //   keepComments: true,
      //   variant: sh2.LangVariant.LangPOSIX,
      // });
      return this.handleNode(result as any) as BashScript;
    } catch (error) {
      if (error.Error) {
        error.message = (error as bashAST.ParseError).Error();
        if (
          error.message.includes("bash/mksh feature") &&
          variant != syntax.LangBash
        ) {
          return this.parse(syntax.LangBash);
        }
        this.errors.push(error);
      }
    }
  }
}

export async function parseShell(shString: string) {
  const p = new Position(0, 0);
  p.file = new File(undefined, shString);
  return new ShellParser(shString).parse();
}
