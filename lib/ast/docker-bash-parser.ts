import sh, { Node, Pos } from "mvdan-sh";
import { type } from "os";
import * as bashAST from "./mvdan-sh-types";
const { syntax } = sh;

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
} from "./docker-type";

export class ShellParser {
  constructor(
    readonly shString: string,
    readonly originalPosition: Position = new Position(0, 0)
  ) {}

  private pos(node: Node | Pos): Position {
    if ((node as Node).Pos !== undefined) {
      const n: Node = node as Node;
      // Dockerfile position start at line 0
      return new Position(
        n.Pos().Line() - 1 + this.originalPosition.lineStart,
        n.Pos().Col(),
        n.End().Line() - 1 + this.originalPosition.lineStart,
        n.End().Col()
      );
    }

    const p: Pos = node as Pos;
    return new Position(
      p.Line() - 1 + this.originalPosition.lineStart,
      p.Col()
    );
  }

  private handleNodes(node: Node[], current: DockerOpsNodeType) {
    for (const child of node) {
      current.addChild(this.handleNode(child));
    }
    return current;
  }
  private handleNode(node: Node): DockerOpsNodeType | DockerOpsNodeType[] {
    if (node == null) {
      throw new Error("node is null");
    }
    if (!(node as any).$type) {
      throw new Error("node type now found: " + node);
    }
    const nodeType: string = (node as any).$type.split("*").at(-1);
    switch (nodeType) {
      case "ArithmCmd":
        const ArithmCmd = node as bashAST.ArithmCmd;
        return this.handleNode(ArithmCmd.X);
      case "ArithmExp":
        const ArithmExp = node as bashAST.ArithmExp;
        return new BashArithmeticBinary()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(ArithmExp.X));
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
        return new BashArithmeticBinary()
          .setPosition(this.pos(node))
          .addChild(
            new BashArithmeticBinaryOp()
              .setPosition(this.pos(BinaryArithm.OpPos))
              .addChild(new BashOp(BinaryArithm.Op + ""))
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
      case "BinaryCmd":
        const BinaryCmd = node as bashAST.BinaryCmd;
        return new BashConditionBinary()
          .setPosition(this.pos(node))
          .addChild(
            new BashConditionBinaryOp()
              .setPosition(this.pos(BinaryCmd.OpPos))
              .addChild(new BashOp(BinaryCmd.Op + ""))
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
        return new BashCaseExpression()
          .setPosition(this.pos(node))
          .addChild(
            new BashCaseExpTarget()
              .setPosition(this.pos(CaseClause.Word))
              .addChild(this.handleNode(CaseClause.Word))
          )
          .addChild(this.handleNodes(CaseClause.Items, new BashCaseExpCases()));
      case "CaseItem":
        const CaseItem = node as bashAST.CaseItem;
        return new BashCaseExpCase()
          .setPosition(this.pos(node))
          .addChild(
            new BashCaseKind(CaseItem.Op + "").setPosition(
              this.pos(CaseItem.OpPos)
            )
          )
          .addChild(this.handleNodes(CaseItem.Patterns, new BashCaseLabels()))
          .addChild(
            this.handleNodes(CaseItem.Stmts, new BashCaseExpressions())
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
        return new BashComment(Comment.Text).setPosition(this.pos(node));

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
        const dollar = new BashDollarParens()
          .setPosition(this.pos(node))
          .addChild(this.handleNode(ParamExp.Param));
        if (ParamExp.Slice) {
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
        } else {
          console.log("redirect kind", Redirect.Op);
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
      case "Replace":
        const Replace = node as bashAST.Replace;
        break;
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

        this.handleNodes(Stmt.Comments, cmdStmt);

        if (Stmt.Negated) {
          return new BashConditionUnary()
            .setPosition(this.pos(node))
            .addChild(new BashConditionUnaryOp("!"))
            .addChild(new BashConditionUnaryExp().addChild(cmdStmt));
        }

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
        return this.handleNodes(
          WhileClause.Do,
          this.handleNodes(
            WhileClause.Cond,
            new BashWhileExpression().setPosition(this.pos(node))
          )
        );
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
        return new BashBraceExpansion(Expansion.Op.toString()).addChild(
          this.handleNode(Expansion.Word)
        );
      case "Slice":
        const Slice = node as bashAST.Slice;
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
      case "ProcOperator":
        const ProcOperator = node as bashAST.ProcOperator;
      case "ProcSubst":
        const ProcSubst = node as bashAST.ProcSubst;
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
      case "UnaryArithm":
        const UnaryArithm = node as bashAST.UnaryArithm;
      case "UnaryTest":
        const UnaryTest = node as bashAST.UnaryTest;
        console.error("Unhandled type", type);
        break;
    }
    console.log(nodeType, "not handled");
    return new Unknown().addChild(new BashLiteral(nodeType));
  }

  parse(): DockerOpsNodeType {
    const parser: bashAST.Parser = syntax.NewParser(
      syntax.KeepComments(true),
      syntax.Variant(syntax.LangPOSIX)
    ) as any;

    try {
      const result = parser.Parse(this.shString, "src.sh");
      return this.handleNode(result) as BashScript;
    } catch (error) {
      console.log("PARSING", error);
      console.log(
        (error as bashAST.ParseError).Error(),
        (syntax as any).IsIncomplete(error)
      );
      return new Unknown().addChild(new BashLiteral(error.Message));
    }
  }
}

export function parseShell(shString: string): DockerOpsNodeType {
  return new ShellParser(shString).parse();
}
