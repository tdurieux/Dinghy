import sh, { Node, Pos } from "mvdan-sh";
import { type } from "os";
import * as bashAST from "./bashAST";
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
} from "./type";

function pos(node: Node | Pos): Position {
  if ((node as Node).Pos !== undefined) {
    const n: Node = node as Node;
    return new Position(
      n.Pos().Line(),
      n.Pos().Col(),
      n.End().Line(),
      n.End().Col()
    );
  }

  const p: Pos = node as Pos;
  return new Position(p.Line(), p.Col());
}
function handleNodes(node: Node[], current: DockerOpsNodeType) {
  for (const child of node) {
    current.addChild(handleNode(child));
  }
  return current;
}
function handleNode(node: Node): DockerOpsNodeType | DockerOpsNodeType[] {
  if (node == null) {
    throw new Error("node is null");
  }
  const nodeType = syntax.NodeType(node);
  switch (nodeType) {
    case "ArithmCmd":
      const ArithmCmd = node as bashAST.ArithmCmd;
      return handleNode(ArithmCmd.X);
    case "ArithmExp":
      const ArithmExp = node as bashAST.ArithmExp;
      return new BashArithmeticBinary()
        .setPosition(pos(node))
        .addChild(handleNode(ArithmExp.X));
    case "ArithmExpr":
      const ArithmExpr = node as bashAST.ArithmExpr;
      return handleNode(ArithmExpr.Node);
    case "ArrayExpr":
      const ArrayExpr = node as bashAST.ArrayExpr;
      const arr = new BashArray().setPosition(pos(node));
      for (const elem of ArrayExpr.Elems) {
        arr.addChild(handleNode(elem));
      }
      return arr;
    case "Assign":
      const Assign = node as bashAST.Assign;
      const ass = new BashAssign()
        .setPosition(pos(node))
        .addChild(
          new BashAssignLhs().addChild(
            new BashVariable(Assign.Name.Value).setPosition(pos(Assign.Name))
          )
        );
      if (Assign.Value) {
        ass.addChild(
          new BashAssignRhs()
            .setPosition(pos(Assign.Value))
            .addChild(handleNode(Assign.Value))
        );
      }
      return ass;
    case "BinAritOperator":
      const BinAritOperator = node as bashAST.BinAritOperator;
      return new BashOp(BinAritOperator.String()).setPosition(pos(node));

    case "BinaryArithm":
      const BinaryArithm = node as bashAST.BinaryArithm;
      return new BashArithmeticBinary()
        .setPosition(pos(node))
        .addChild(
          new BashArithmeticBinaryOp()
            .setPosition(pos(BinaryArithm.OpPos))
            .addChild(new BashOp(BinaryArithm.Op + ""))
        )
        .addChild(
          new BashArithmeticBinaryLhs()
            .setPosition(pos(BinaryArithm.X))
            .addChild(handleNode(BinaryArithm.X))
        )
        .addChild(
          new BashArithmeticBinaryRhs()
            .setPosition(pos(BinaryArithm.Y))
            .addChild(handleNode(BinaryArithm.Y))
        );
    case "BinaryCmd":
      const BinaryCmd = node as bashAST.BinaryCmd;
      return new BashConditionBinary()
        .setPosition(pos(node))
        .addChild(
          new BashConditionBinaryOp()
            .setPosition(pos(BinaryCmd.OpPos))
            .addChild(new BashOp(BinaryCmd.Op + ""))
        )
        .addChild(
          new BashConditionBinaryLhs()
            .setPosition(pos(BinaryCmd.X))
            .addChild(handleNode(BinaryCmd.X))
        )
        .addChild(
          new BashConditionBinaryRhs()
            .setPosition(pos(BinaryCmd.Y))
            .addChild(handleNode(BinaryCmd.Y))
        );
    case "Block":
      const Block = node as bashAST.Block;
      return Block.Stmts.map(handleNode) as DockerOpsNodeType[];
    case "CallExpr":
      const CallExpr = node as bashAST.CallExpr;
      const cmd = new MaybeSemanticCommand().setPosition(pos(node));
      for (let i = 0; i < CallExpr.Assigns.length; i++) {
        const arg = CallExpr.Assigns[i];
        cmd.addChild(
          new BashCommandPrefix()
            .setPosition(pos(arg))
            .addChild(handleNode(arg))
        );
      }
      if (CallExpr.Args.length > 0) {
        cmd.addChild(
          new BashCommandCommand()
            .setPosition(pos(CallExpr.Args[0]))
            .addChild(handleNode(CallExpr.Args[0]))
        );
        for (let i = 1; i < CallExpr.Args.length; i++) {
          const arg = CallExpr.Args[i];
          cmd.addChild(
            new BashCommandArgs()
              .setPosition(pos(arg))
              .addChild(handleNode(arg))
          );
        }
      }
      return cmd;
    case "CaseClause":
      const CaseClause = node as bashAST.CaseClause;
      return new BashCaseExpression()
        .setPosition(pos(node))
        .addChild(
          new BashCaseExpTarget()
            .setPosition(pos(CaseClause.Word))
            .addChild(handleNode(CaseClause.Word))
        )
        .addChild(handleNodes(CaseClause.Items, new BashCaseExpCases()));
    case "CaseItem":
      const CaseItem = node as bashAST.CaseItem;
      return new BashCaseExpCase()
        .setPosition(pos(node))
        .addChild(
          new BashCaseKind(CaseItem.Op + "").setPosition(pos(CaseItem.OpPos))
        )
        .addChild(handleNodes(CaseItem.Patterns, new BashCaseLabels()))
        .addChild(handleNodes(CaseItem.Stmts, new BashCaseExpressions()));
    case "CmdSubst":
      const CmdSubst = node as bashAST.CmdSubst;
      return handleNodes(
        CmdSubst.Stmts,
        new BashDollarParens().setPosition(pos(node))
      );
    case "Command":
      const Command = node as bashAST.Command;
      const bCmd = new MaybeSemanticCommand()
        .setPosition(pos(node))
        .addChild(handleNode(Command.Node));
      return bCmd;
    case "Comment":
      const Comment = node as bashAST.Comment;
      return new BashComment(Comment.Text).setPosition(pos(node));

    case "DblQuoted":
      const DblQuoted = node as bashAST.DblQuoted;
      const bDQ = new BashDoubleQuoted().setPosition(pos(node));
      DblQuoted.Parts.forEach((part) => {
        bDQ.addChild(handleNode(part));
      });
      return bDQ;

    case "File":
      return handleNodes(
        (node as bashAST.File).Stmts,
        new BashScript().setPosition(pos(node))
      );
    case "ForClause":
      const ForClause = node as bashAST.ForClause;
      const loop = handleNode(ForClause.Loop) as BashWord;

      return new BashForIn()
        .setPosition(pos(node))
        .addChild(new BashForInVariable().addChild(loop.variable))
        .addChild(new BashForInItems().addChild(loop.items))
        .addChild(
          handleNodes(
            ForClause.Do,
            new BashForInBody().setPosition(pos(ForClause.DoPos))
          )
        );
    case "FuncDecl":
      const FuncDecl = node as bashAST.FuncDecl;
      return new BashFunction()
        .setPosition(pos(node))
        .addChild(
          new BashFunctionName()
            .setPosition(pos(FuncDecl.Name))
            .addChild(handleNode(FuncDecl.Name))
        )
        .addChild(
          new BashFunctionBody()
            .setPosition(pos(FuncDecl.Body))
            .addChild(handleNode(FuncDecl.Body))
        );

    case "IfClause":
      const IfClause = node as bashAST.IfClause;
      const bIf = new BashIfExpression().setPosition(pos(node));
      bIf
        .addChild(
          handleNodes(
            IfClause.Cond,
            new BashIfCondition().setPosition(pos(IfClause.Position))
          )
        )
        .addChild(
          handleNodes(
            IfClause.Then,
            new BashIfThen().setPosition(pos(IfClause.ThenPos))
          )
        );
      if (IfClause.Else) {
        bIf.addChild(
          new BashIfElse()
            .setPosition(pos(IfClause.Else))
            .addChild(handleNode(IfClause.Else))
        );
      }
      return bIf;

    case "Lit":
      const Lit = node as bashAST.Lit;
      return new BashLiteral(Lit.Value).setPosition(pos(node));
    case "Loop":
      const Loop = node as bashAST.Loop;
      return handleNode(Loop.Node);
    case "ParExpOperator":
      const ParExpOperator = node as bashAST.ParExpOperator;
      break;
    case "ParNamesOperator":
      const ParNamesOperator = node as bashAST.ParNamesOperator;
      break;
    case "ParamExp":
      const ParamExp = node as bashAST.ParamExp;
      const dollar = new BashDollarParens()
        .setPosition(pos(node))
        .addChild(handleNode(ParamExp.Param));
      if (ParamExp.Slice) {
        dollar.addChild(handleNode(ParamExp.Slice));
      }
      if (ParamExp.Repl) {
        dollar.addChild(handleNode(ParamExp.Repl));
      }
      if (ParamExp.Exp) {
        dollar.addChild(handleNode(ParamExp.Exp));
      }
      return dollar;

    case "Redirect":
      const Redirect = node as bashAST.Redirect;
      const out = new BashRedirectRedirects().setPosition(pos(node));
      let op: DockerOpsNodeType;
      if (Redirect.Op === 54) {
        // >
        op = new BashRedirectOverwrite();
      } else if (Redirect.Op === 59) {
        // 2>
        op = new BashRedirectStderr();
      } else {
        console.log("redirect kind", Redirect.Op);
        op = new BashRedirectAppend();
      }
      op.setPosition(pos(Redirect.OpPos)).addChild(
        new BashPath()
          .setPosition(pos(Redirect.Word))
          .addChild(handleNode(Redirect.Word))
      );
      if (Redirect.N) {
        op.addChild(handleNode(Redirect.N));
      }
      if (Redirect.Hdoc) {
        op.addChild(handleNode(Redirect.Hdoc));
      }
      out.addChild(op);
      return new BashRedirect().setPosition(pos(node)).addChild(out);
    case "Replace":
      const Replace = node as bashAST.Replace;
      break;
    case "SglQuoted":
      const SglQuoted = node as bashAST.SglQuoted;
      return new BashSingleQuoted(SglQuoted.Value).setPosition(pos(node));
    case "Slice":
      const Slice = node as bashAST.Slice;
      break;
    case "Stmt":
      const Stmt = node as bashAST.Stmt;
      const redirects = Stmt.Redirs.map(handleNode) as DockerOpsNodeType[];

      let cmdStmt = handleNode(Stmt.Cmd) as MaybeSemanticCommand;
      if (Array.isArray(cmdStmt)) {
        const tmp = new MaybeSemanticCommand()
          .setPosition(pos(node))
          .addChild(new BashBraceGroup().setPosition(pos(node)));
        cmdStmt.map((i) => tmp.children[0].addChild(i));
        cmdStmt = tmp;
      }
      if (cmdStmt == null) throw new Error("CMD cannot be null");
      if (redirects.length > 0) cmdStmt.addChild(redirects);

      cmdStmt.semicolon = Stmt.Semicolon.Line() > 0 && Stmt.Semicolon.Col() > 0;

      handleNodes(Stmt.Comments, cmdStmt);

      if (Stmt.Negated) {
        return new BashConditionUnary()
          .setPosition(pos(node))
          .addChild(new BashConditionUnaryOp("!"))
          .addChild(new BashConditionUnaryExp().addChild(cmdStmt));
      }

      return cmdStmt;
    case "StmtList":
      const StmtList = node as bashAST.StmtList;
      const bS = new BashScript().setPosition(pos(node));
      for (const child of StmtList.Stmts) {
        if (child != null) bS.addChild(handleNode(child));
      }
      return bS;
    case "Subshell":
      const Subshell = node as bashAST.Subshell;
      return handleNodes(
        Subshell.Stmts,
        new BashSubshell().setPosition(pos(node))
      );
    case "UnAritOperator":
      const UnAritOperator = node as bashAST.UnAritOperator;
      return new BashOp(UnAritOperator.String()).setPosition(pos(node));
    case "WhileClause":
      const WhileClause = node as bashAST.WhileClause;
      return handleNodes(
        WhileClause.Do,
        handleNodes(
          WhileClause.Cond,
          new BashWhileExpression().setPosition(pos(node))
        )
      );
    case "Word":
      const Word = node as bashAST.Word;
      // const bL = new BashLiteral(Word.Lit());
      const bW = new BashWord().setPosition(pos(node));
      // if (bL.value != "") bW.addChild(bL);
      for (let part of Word.Parts) {
        bW.addChild(handleNode(part));
      }
      return bW;
    case "WordIter":
      const WordIter = node as bashAST.WordIter;

      const bV = new BashVariable(WordIter.Name.Value).setPosition(
        pos(WordIter.Name)
      );
      const bWW = new BashWord().setPosition(pos(node));
      if (bV.value != "") bWW.addChild(bV);
      for (let part of WordIter.Items) {
        bWW.addChild(handleNode(part));
      }
      return bWW;
    case "WordPart":
      const WordPart = node as bashAST.WordPart;
      return handleNode(WordPart.Node);

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
    case "Expansion":
      const Expansion = node as bashAST.Expansion;
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
      console.error("Unhandled type", type)
      break;
  }
  console.log(nodeType, "not handled");
  return new Unknown().addChild(new BashLiteral(nodeType));
}
export function parseShell(shString: string): DockerOpsNodeType {
  const parser: bashAST.Parser = syntax.NewParser(
    syntax.KeepComments(true),
    syntax.Variant(syntax.LangPOSIX)
  ) as any;

  try {
    const result = parser.Parse(shString, "src.sh");
    return handleNode(result) as BashScript;
  } catch (error) {
    console.log(error);
    // console.log(
    //   (error as bashAST.ParseError).Error(),
    //   (syntax as any).IsIncomplete(error)
    // );
    return new Unknown().addChild(new BashLiteral(error.Message));
  }
}
