import { syntax } from "mvdan-sh";
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
  BashScript,
  BashSingleQuoted,
  BashSubshell,
  BashVariable,
  BashWhileExpression,
  BashWord,
  BashCommand,
  BashFunctionName,
  BashFunctionBody,
  BashComment,
  BashBraceGroup,
  BashBraceExpansion,
  BashProcSub,
  BashProcSubBody,
  BashConditionOp,
  BashUntilBody,
  BashUntilCondition,
  BashReplace,
  BashDollarBrace,
  BashArithmeticExpression,
  BashWordIteration as BashWordIteration,
  BashDeclClause,
  BashConditionExp,
  BashCondition,
  BashStatement,
  ShellNodeTypes,
} from "./shell-types";
import File from "../core/file";
import {
  ParserError,
  ParserErrors,
  Position,
  Unknown,
} from "../core/core-types";

export class ShellParser {
  /**
   * Contains all errors that occurred during parsing
   */
  readonly errors: ParserError<ShellNodeTypes>[] = [];
  /**
   * Contains the current parsing stack
   */
  private stack: ShellNodeTypes[] = [];

  constructor(
    readonly scriptString: string,
    readonly originalPosition: Position = new Position(0, 0)
  ) {}

  private stackIn(node: ShellNodeTypes) {
    this.stack.push(node);
  }
  private stackOut() {
    this.stack.pop();
  }

  private pos(node: bashAST.Node[] | bashAST.Node | bashAST.Pos): Position {
    if (node == null) {
      return null;
    }
    if (Array.isArray(node)) {
      node = node.filter((n) => n != null);
      if (node.length == 0) {
        return null;
      }
      const firstP = this.pos(node[0]);
      const firstL = this.pos(node[node.length - 1]);
      firstP.lineEnd = firstL.lineEnd;
      firstP.columnEnd = firstL.columnEnd;
      return firstP;
    } else if ((node as bashAST.Node).Pos !== undefined) {
      const n: bashAST.Node = node as bashAST.Node;

      const lineStart = n.Pos().Line() - 1 + this.originalPosition.lineStart;
      let lineEnd = n.End().Line() - 1 + this.originalPosition.lineStart;
      let columnStart = n.Pos().Col() - 1;
      if (lineStart == this.originalPosition.lineStart) {
        columnStart += this.originalPosition.columnStart;
      }
      let columnEnd = n.End().Col() - 1;
      if (lineEnd == this.originalPosition.lineStart) {
        columnEnd += this.originalPosition.columnStart;
      }
      if (
        columnEnd == 0 &&
        this.originalPosition.file.content
          .split("\n")
          [lineEnd - 1].endsWith("\\")
      ) {
        columnEnd =
          this.originalPosition.file.content.split("\n")[lineEnd - 1].length -
          1;
        lineEnd = lineEnd - 1;
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

  private handleNodes(node: bashAST.Node[], current: ShellNodeTypes) {
    for (const child of node) {
      current.addChild(this.handleNode(child));
    }
    return current;
  }

  private handleNode(node: bashAST.Node): ShellNodeTypes | ShellNodeTypes[] {
    if (node == null) {
      throw new Error("node is null");
    }
    if (!node.$type) {
      throw new Error("node type now found: " + node);
    }
    try {
      const nodeType: string = (node as any).$type.split("*").at(-1);
      switch (nodeType) {
        case "ArithmCmd":
          const ArithmCmd = node as bashAST.ArithmCmd;
          return this.handleNode(ArithmCmd.X);
        case "ArithmExp":
          const ArithmExp = node as bashAST.ArithmExp;
          const bab = new BashArithmeticExpression().setPosition(
            this.pos(node)
          );
          bab.bracket = ArithmExp.Bracket;
          this.stackIn(bab);
          bab.addChild(this.handleNode(ArithmExp.X));
          this.stackOut();
          return bab;
        case "ArithmExpr":
          const ArithmExpr = node as bashAST.ArithmExpr;
          return this.handleNode(ArithmExpr.Node);
        case "ArrayExpr":
          const ArrayExpr = node as bashAST.ArrayExpr;
          const arr = new BashArray().setPosition(this.pos(node));
          this.stackIn(arr);
          for (const elem of ArrayExpr.Elems) {
            arr.addChild(this.handleNode(elem));
          }
          this.stackOut();
          return arr;
        case "Assign":
          const Assign = node as bashAST.Assign;
          const ass = new BashAssign().setPosition(this.pos(node));
          this.stackIn(ass);
          ass.addChild(
            new BashAssignLhs()
              .setPosition(this.pos(Assign.Name))
              .addChild(
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
          this.stackOut();
          return ass;
        case "BinAritOperator":
          const BinAritOperator = node as bashAST.BinAritOperator;
          return new BashOp(BinAritOperator.String()).setPosition(
            this.pos(node)
          );

        case "BinaryArithm":
          const BinaryArithm = node as bashAST.BinaryArithm;
          const ba = new BashArithmeticBinary().setPosition(this.pos(node));
          this.stackIn(ba);
          ba.addChild(
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
          this.stackOut();
          return ba;
        case "BinaryCmd":
          const BinaryCmd = node as bashAST.BinaryCmd;
          const bashConditionBinary = new BashConditionBinary().setPosition(
            this.pos(node)
          );
          this.stackIn(bashConditionBinary);

          bashConditionBinary.addChild(
            new BashConditionBinaryOp()
              .setPosition(this.pos(BinaryCmd.OpPos))
              .addChild(
                new BashOp(BinaryCmd.Op + "").setPosition(
                  this.pos(BinaryCmd.OpPos)
                )
              )
          );
          const lhs = new BashConditionBinaryLhs().setPosition(
            this.pos(BinaryCmd.X)
          );
          bashConditionBinary.addChild(lhs);
          this.stackIn(bashConditionBinary);
          lhs.addChild(this.handleNode(BinaryCmd.X));
          this.stackOut();

          const rhs = new BashConditionBinaryRhs().setPosition(
            this.pos(BinaryCmd.Y)
          );
          bashConditionBinary.addChild(rhs);

          this.stackIn(rhs);
          rhs.addChild(this.handleNode(BinaryCmd.Y));
          this.stackOut();

          this.stackOut();
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
          for (const comment of bashConditionBinary.getChildren(BashComment)) {
            comment.remove();
            if (bashConditionBinary.op.isBefore(comment)) {
              bashConditionBinary.right.addChild(comment);
              if (bashConditionBinary.right.isBefore(comment)) {
                bashConditionBinary.right.position.lineEnd = Math.max(
                  comment.position.lineEnd,
                  comment.position.lineEnd
                );
                bashConditionBinary.right.position.columnEnd = Math.max(
                  comment.position.columnEnd,
                  bashConditionBinary.right.position.columnEnd
                );
              } else {
                bashConditionBinary.right.position.lineStart = Math.min(
                  comment.position.lineStart,
                  bashConditionBinary.right.position.lineStart
                );
                bashConditionBinary.right.position.columnStart = Math.min(
                  comment.position.columnStart,
                  bashConditionBinary.right.position.columnStart
                );
              }
            } else {
              bashConditionBinary.left.addChild(comment);
              if (bashConditionBinary.left.isBefore(comment)) {
                bashConditionBinary.left.position.lineEnd = Math.max(
                  comment.position.lineEnd,
                  comment.position.lineEnd
                );
                bashConditionBinary.left.position.columnEnd = Math.max(
                  comment.position.columnEnd,
                  bashConditionBinary.left.position.columnEnd
                );
              } else {
                bashConditionBinary.left.position.lineStart = Math.min(
                  comment.position.lineStart,
                  bashConditionBinary.left.position.lineStart
                );
                bashConditionBinary.left.position.columnStart = Math.min(
                  comment.position.columnStart,
                  bashConditionBinary.left.position.columnStart
                );
              }
            }
          }
          return bashConditionBinary;
        case "Block":
          const Block = node as bashAST.Block;
          return Block.Stmts.map((e) => this.handleNode(e)) as ShellNodeTypes[];
        case "CallExpr":
          const CallExpr = node as bashAST.CallExpr;
          const cmd = new BashCommand().setPosition(this.pos(node));
          this.stackIn(cmd);
          for (let i = 0; i < CallExpr.Assigns.length; i++) {
            const arg = CallExpr.Assigns[i];
            cmd.addChild(
              new BashCommandPrefix()
                .setPosition(this.pos(arg))
                .addChild(this.handleNode(arg))
            );
          }
          if (CallExpr.Args.length > 0) {
            if (CallExpr.Args[0].Lit() == "[") {
              const cond = new BashCondition().setPosition(cmd.position);
              // get assignement from the command
              cond.children = cmd.children;
              for (let i = 1; i < CallExpr.Args.length; i++) {
                const arg = CallExpr.Args[i];
                if (arg.Lit() == "]") {
                  continue;
                }
                cond.addChild(
                  new BashConditionExp()
                    .setPosition(this.pos(arg))
                    .addChild(this.handleNode(arg))
                );
              }
              return cond;
            }
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
          this.stackOut();
          return cmd;
        case "CaseClause":
          const CaseClause = node as bashAST.CaseClause;
          const bce = new BashCaseExpression().setPosition(this.pos(node));
          this.stackIn(bce);
          bce.hasBraces = CaseClause.Braces;

          const bashCaseExpTarget = new BashCaseExpTarget().setPosition(
            this.pos(CaseClause.Word)
          );
          bce.addChild(bashCaseExpTarget);
          this.stackIn(bashCaseExpTarget);
          bashCaseExpTarget.addChild(this.handleNode(CaseClause.Word));
          this.stackOut();

          const bashCaseExpCases = new BashCaseExpCases().setPosition(
            this.pos(CaseClause.Items)
          );
          bce.addChild(bashCaseExpCases);
          this.stackIn(bashCaseExpCases);
          this.handleNodes(CaseClause.Items, bashCaseExpCases);
          this.stackOut();

          this.stackOut();
          return bce;
        case "CaseItem":
          const CaseItem = node as bashAST.CaseItem;
          const bsrc = new BashCaseExpCase().setPosition(this.pos(node));
          this.stackIn(bsrc);
          bsrc
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
          this.stackOut();
          return bsrc;
        case "CmdSubst":
          const CmdSubst = node as bashAST.CmdSubst;
          const bdp = new BashDollarParens().setPosition(this.pos(node));
          this.stackIn(bdp);
          this.handleNodes(CmdSubst.Stmts, bdp);
          this.stackOut();
          return bdp;
        case "DeclClause":
          const DeclClause = node as bashAST.DeclClause;
          const bdc = new BashDeclClause(DeclClause.Variant.Value).setPosition(
            this.pos(node)
          );
          this.stackIn(bdc);
          this.handleNodes(DeclClause.Args, bdc);
          this.stackOut();
          return bdc;
        case "Command":
          const Command = node as bashAST.Command;
          const bCmd = new BashCommand().setPosition(this.pos(node));
          this.stackIn(bCmd);
          bCmd.addChild(this.handleNode(Command.Node));
          this.stackOut();
          return bCmd;
        case "Comment":
          const Comment = node as bashAST.Comment;
          const comment = new BashComment(
            Comment.Text.trimEnd()
              // remove the \ that has been added at the end of the line
              .replace(/(.*)\\$/g, "$1")
              .trimEnd()
          ).setPosition(this.pos(node));
          return comment;

        case "DblQuoted":
          const DblQuoted = node as bashAST.DblQuoted;
          const bDQ = new BashDoubleQuoted().setPosition(this.pos(node));
          this.stackIn(bDQ);
          DblQuoted.Parts.forEach((part) => {
            bDQ.addChild(this.handleNode(part));
          });
          this.stackOut();
          return bDQ;

        case "File":
          const bs = new BashScript().setPosition(this.pos(node));
          this.stackIn(bs);
          this.handleNodes((node as bashAST.File).Stmts, bs);
          this.stackOut();
          return bs;
        case "ForClause":
          const ForClause = node as bashAST.ForClause;
          const bfi = new BashForIn().setPosition(this.pos(node));
          bfi.doPosition = this.pos(ForClause.DoPos);
          bfi.donePosition = this.pos(ForClause.DonePos);
          bfi.forPosition = this.pos(ForClause.ForPos);

          this.stackIn(bfi);

          const bfib = new BashForInBody().setPosition(this.pos(ForClause.Do));
          const loop = this.handleNode(ForClause.Loop) as BashWordIteration;
          bfi.addChild(loop).addChild(bfib);
          this.stackIn(bfib);
          this.handleNodes(ForClause.Do, bfib);
          this.stackOut();
          this.stackOut();
          return bfi;
        case "FuncDecl":
          const FuncDecl = node as bashAST.FuncDecl;
          const bf = new BashFunction().setPosition(this.pos(node));
          this.stackIn(bf);
          bf.addChild(
            new BashFunctionName()
              .setPosition(this.pos(FuncDecl.Name))
              .addChild(this.handleNode(FuncDecl.Name))
          ).addChild(
            new BashFunctionBody()
              .setPosition(this.pos(FuncDecl.Body))
              .addChild(this.handleNode(FuncDecl.Body))
          );
          this.stackOut();
          return bf;

        case "IfClause":
          const IfClause = node as bashAST.IfClause;
          const bIf = new BashIfExpression().setPosition(this.pos(node));
          bIf.ifPosition = this.pos(IfClause.Position);
          bIf.fiPosition = this.pos(IfClause.FiPos);
          this.stackIn(bIf);

          if (IfClause.Cond && IfClause.Cond.length > 0) {
            const bIfCond = new BashIfCondition().setPosition(
              this.pos(IfClause.Cond)
            );
            bIf.addChild(bIfCond);

            this.stackIn(bIfCond);
            this.handleNodes(IfClause.Cond, bIfCond);
            this.stackOut();
          }

          const thenPosition = this.pos(IfClause.Then);
          if (IfClause.Cond && IfClause.Cond.length > 0) {
            const thenNodePosition = this.pos(IfClause.ThenPos);
            thenPosition.lineStart = thenNodePosition.lineStart;
            thenPosition.columnStart = thenNodePosition.columnStart;
          }
          const thenNode = new BashIfThen().setPosition(thenPosition);
          thenNode.thenPosition = this.pos(IfClause.Then);
          this.handleNodes(IfClause.Then, thenNode);

          bIf.addChild(thenNode);

          if (IfClause.Else) {
            bIf.addChild(
              new BashIfElse()
                .setPosition(this.pos(IfClause.Else))
                .addChild(this.handleNode(IfClause.Else))
            );
          }
          this.stackOut();
          return bIf;

        case "Lit":
          const Lit = node as bashAST.Lit;
          return new BashLiteral(Lit.Value).setPosition(this.pos(node));
        case "Loop":
          const Loop = node as bashAST.Loop;
          return this.handleNode(Loop.Node);

        case "ParamExp":
          const ParamExp = node as bashAST.ParamExp;
          const dollar = new BashDollarBrace().setPosition(this.pos(node));
          this.stackIn(dollar);
          dollar.addChild(this.handleNode(ParamExp.Param));
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
          this.stackOut();
          return dollar;

        case "Redirect":
          const Redirect = node as bashAST.Redirect;
          const br = new BashRedirect().setPosition(this.pos(node));
          this.stackIn(br);
          const op = new BashOp(Redirect.Op + "").setPosition(
            this.pos(Redirect.OpPos)
          );
          br.addChild(op);
          br.addChild(
            new BashPath()
              .setPosition(this.pos(Redirect.Word))
              .addChild(this.handleNode(Redirect.Word))
          );
          if (Redirect.N) {
            br.addChild(this.handleNode(Redirect.N));
          }
          if (Redirect.Hdoc) {
            br.addChild(this.handleNode(Redirect.Hdoc));
          }
          this.stackOut();
          return br;
        case "SglQuoted":
          const SglQuoted = node as bashAST.SglQuoted;
          return new BashSingleQuoted(SglQuoted.Value).setPosition(
            this.pos(node)
          );
        case "Stmt":
          const Stmt = node as bashAST.Stmt;
          const redirects = Stmt.Redirs.map((e) =>
            this.handleNode(e)
          ) as ShellNodeTypes[];

          if (!Stmt.Cmd) {
            return redirects;
          }

          let cmdStmt = this.handleNode(Stmt.Cmd) as
            | BashStatement
            | BashStatement[];
          if (Array.isArray(cmdStmt)) {
            const tmp = new BashCommand()
              .setPosition(this.pos(node))
              .addChild(new BashBraceGroup().setPosition(this.pos(node)));
            cmdStmt.forEach((i) =>
              tmp.children[0].addChild(i as ShellNodeTypes)
            );
            cmdStmt = tmp;
            this.stackIn(cmdStmt as BashCommand);
          } else {
            this.stackIn(cmdStmt as BashCommand);
          }
          if (cmdStmt == null) throw new Error("CMD cannot be null");
          if (redirects.length > 0) cmdStmt.addChild(redirects);

          cmdStmt.semicolon =
            Stmt.Semicolon.Line() > 0 && Stmt.Semicolon.Col() > 0;
          cmdStmt.semicolonPosition = this.pos(Stmt.Semicolon);
          cmdStmt.isBackground = Stmt.Background;
          cmdStmt.isCoprocess = Stmt.Coprocess;
          cmdStmt.isNegated = Stmt.Negated;
          cmdStmt.setPosition(this.pos(node));

          this.handleNodes(Stmt.Comments, cmdStmt as BashCommand);
          for (const comment of cmdStmt.getChildren(BashComment)) {
            if (!cmdStmt.isInside(comment)) {
              // the comment is not inside the command and need to me relocated
              comment.remove();
              let lastInside = null;
              for (let i = this.stack.length - 1; i >= 0; i--) {
                if (!this.stack[i] || !this.stack[i].traverse) {
                  continue;
                }
                this.stack[i].traverse(
                  (x) => {
                    if (x.isInside(comment)) {
                      lastInside = x;
                    }
                  },
                  { includeSelf: true }
                );
                if (lastInside) {
                  lastInside.addChild(comment);
                  break;
                }
              }
            }
          }
          this.stackOut();
          return cmdStmt as BashCommand | BashCondition;
        case "StmtList":
          const StmtList = node as bashAST.StmtList;
          const bS = new BashScript().setPosition(this.pos(node));
          this.stackIn(bS);
          for (const child of StmtList.Stmts) {
            if (child != null) bS.addChild(this.handleNode(child));
          }
          this.stackOut();
          return bS;
        case "Subshell":
          const Subshell = node as bashAST.Subshell;
          const bss = new BashSubshell().setPosition(this.pos(node));
          this.stackIn(bss);
          this.handleNodes(Subshell.Stmts, bss);
          this.stackOut();
          return bss;
        case "UnAritOperator":
          const UnAritOperator = node as bashAST.UnAritOperator;
          return new BashOp(UnAritOperator.String()).setPosition(
            this.pos(node)
          );
        case "WhileClause":
          const WhileClause = node as bashAST.WhileClause;
          const whileE = new BashWhileExpression().setPosition(this.pos(node));
          this.stackIn(whileE);
          whileE.doPosition = this.pos(WhileClause.DoPos);
          whileE.donePosition = this.pos(WhileClause.DonePos);
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
          this.stackOut();
          return whileE;
        case "Word":
          const Word = node as bashAST.Word;
          // const bL = new BashLiteral(Word.Lit());
          const bW = new BashWord().setPosition(this.pos(node));
          this.stackIn(bW);
          // if (bL.value != "") bW.addChild(bL);
          for (let part of Word.Parts) {
            bW.addChild(this.handleNode(part));
          }
          this.stackOut();
          return bW;
        case "WordIter":
          const WordIter = node as bashAST.WordIter;
          const bWW = new BashWordIteration().setPosition(this.pos(node));
          bWW.inPosition = this.pos(WordIter.InPos);
          this.stackIn(bWW);

          const bV = new BashVariable(WordIter.Name.Value).setPosition(
            this.pos(WordIter.Name)
          );
          if (bV.value != "") bWW.addChild(bV);
          for (let part of WordIter.Items) {
            bWW.addChild(this.handleNode(part));
          }
          this.stackOut();
          return bWW;
        case "WordPart":
          const WordPart = node as bashAST.WordPart;
          return this.handleNode(WordPart.Node);
        case "Expansion":
          const Expansion = node as bashAST.Expansion;
          const expansion = new BashBraceExpansion();

          this.stackIn(expansion);

          const bOp = new BashOp(Expansion.Op.toString());
          expansion.addChild(bOp);

          if (Expansion.Word) {
            expansion.addChild(this.handleNode(Expansion.Word));

            const opP = this.pos(Expansion.Word);
            opP.columnStart -= 1;
            opP.lineEnd = opP.lineStart;
            bOp.setPosition(opP);
            opP.columnEnd = opP.columnStart + bOp.toString().length;

            const p = this.pos(Expansion.Word);
            p.columnStart -= bOp.toString().length;
            expansion.setPosition(p);
          }
          this.stackOut();
          return expansion;
        case "ProcSubst":
          const ProcSubst = node as bashAST.ProcSubst;
          const o = new BashProcSub().setPosition(this.pos(node));
          this.stackIn(o);
          o.addChild(
            new BashOp(ProcSubst.Op.toString()).setPosition(
              this.pos(ProcSubst.OpPos)
            )
          ).addChild(
            new BashProcSubBody().setPosition(this.pos(ProcSubst.Rparen))
          );
          this.stackIn(o.getElement(BashProcSubBody));
          this.handleNodes(ProcSubst.Stmts, o.getElement(BashProcSubBody));
          this.stackOut();
          this.stackOut();
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
          const BCU = new BashConditionOp(
            UnaryArithm.Op.toString()
          ).setPosition(this.pos(node));
          this.stackIn(BCU);
          BCU.addChild(this.handleNode(UnaryArithm.X));
          this.stackOut();
          return BCU;
        case "Replace":
          const Replace = node as bashAST.Replace;
          // TODO: handle position
          const brep = new BashReplace().setPosition(
            this.pos([Replace.Orig, Replace.With])
          );

          brep.replaceAll = Replace.All;
          this.stackIn(brep);
          brep.addChild(this.handleNode(Replace.Orig));
          if (Replace.With) {
            brep.addChild(this.handleNode(Replace.With));
          }
          this.stackOut();
          return brep;
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
      this.errors.push(new ParserError(`Unhandled bash type: ${type}`, node));
      return new Unknown().addChild(new BashLiteral(nodeType)) as any;
    } catch (error) {
      this.errors.push(new ParserError(error.message, node, error));
    }
  }

  parse(variant: number = syntax.LangBash): ShellNodeTypes {
    const parser: bashAST.Parser = syntax.NewParser(
      syntax.KeepComments(true),
      syntax.Variant(variant)
    ) as any;

    try {
      const result = parser.Parse(this.scriptString, "src.sh");
      const ast = this.handleNode(result as any) as BashScript;
      if (this.errors.length > 0) {
        throw new ParserErrors(
          "Errors occurred during parsing",
          ast,
          this.errors
        );
      }
      return ast;
    } catch (error) {
      if (error.Error) {
        error.message = (error as bashAST.ParseError).Error();
        if (
          error.message.includes("bash/mksh feature") &&
          variant != syntax.LangBash
        ) {
          const ast = this.parse(syntax.LangBash);
          if (this.errors.length > 0) {
            throw new ParserErrors(
              "Errors occurred during parsing",
              ast,
              this.errors
            );
          }
          return ast;
        }
      }
      this.errors.push(new ParserError(error.message, null, error));
      throw new ParserErrors(error.message, null, this.errors);
    }
  }
}

/**
 * Parses a shell script into a tree of nodes
 * @param shString the script to parse
 * @returns the ast of the script
 */
export function parseShell(shString: string) {
  const p = new Position(0, 0);
  p.file = new File(undefined, shString);
  return new ShellParser(shString, p).parse();
}
