import { createEnrichers } from "./enrich";
import {
  BashCommandArgs,
  BashCommandCommand,
  BashLiteral,
  DockerOpsNodeType,
  MaybeSemanticCommand,
} from "../ast/docker-type";
import { abstract as abstraction } from "./abstraction";
import { Rule, RULES } from "./rules";
import { print } from "../ast/docker-printer";

export class Violation {
  constructor(readonly rule: Rule, readonly node: DockerOpsNodeType) {}

  public async repair() {
    return this.rule.repair(this.node);
  }

  public toString(): string {
    return `[VIOLATION] -> ${this.rule.description}
                           ${print(this.node, true).replace(/\n */g, " ")} at ${
      this.node.position
    }`;
  }
}

export class Matcher {
  private _root: DockerOpsNodeType;

  constructor(root: DockerOpsNodeType) {
    this._root = Matcher.abstract(root);
  }

  public static enrich(root: DockerOpsNodeType) {
    const COMMAND_MAP = createEnrichers();

    root.traverse((node) => {
      if (node instanceof MaybeSemanticCommand) {
        const commandAST = node.command;
        if (!commandAST) return true;

        const command = commandAST.getElement(BashLiteral)?.value;
        if (!command) return true;

        if (COMMAND_MAP[command]) {
          const commandArgs = node.args.filter(
            (e) => e.toString(true).trim() != "--"
          );

          // enrich the arguments of the command
          COMMAND_MAP[command](
            node,
            commandArgs.map((c) => c.toString(true).trim()),
            commandArgs
          );
        }
      }
    });
    return root;
  }

  /**
   * Get the transformed node (enriched and abstracted)
   */
  get node() {
    return this._root;
  }

  /**
   * Abstract the node as a pre-step for the matching
   * @param root
   * @returns
   */
  private static abstract(root: DockerOpsNodeType) {
    return abstraction(Matcher.enrich(root));
  }

  /**
   * Match a rule
   * @param rule
   * @returns
   */
  public match(rule: Rule) {
    const violations: Violation[] = [];

    // find the nodes that may contain a violation
    const candidates = this._root.find(rule.query);

    for (const candidate of candidates) {
      if (
        !rule.consequent.inNode &&
        !rule.consequent.beforeNode &&
        !rule.consequent.afterNode
      ) {
        // if no post-validation  add the violation and continue to the next candidate
        violations.push(new Violation(rule, candidate));
        continue;
      }

      if (
        rule.consequent.inNode &&
        candidate.find(rule.consequent.inNode).length > 0
      ) {
        continue;
      }

      if (rule.consequent.beforeNode !== undefined) {
        const query = rule.consequent.beforeNode;
        const nodeToCheck = getPreviousAndNextParentNodes(
          candidate,
          true,
          rule.scope === "INTRA-DIRECTIVE"
        );
        if (nodeToCheck.some((c) => c.find(query).length != 0)) {
          continue;
        }
      }
      if (rule.consequent.afterNode !== undefined) {
        const query = rule.consequent.afterNode;
        const nodeToCheck = getPreviousAndNextParentNodes(
          candidate,
          false,
          rule.scope === "INTRA-DIRECTIVE"
        );
        if (nodeToCheck.some((c) => c.find(query).length != 0)) {
          continue;
        }
      }

      // if the 3 checks are good a violation has been found
      violations.push(new Violation(rule, candidate));
    }

    return violations;
  }

  public matchAll() {
    const output: Violation[] = [];
    for (const rule of RULES) {
      this.match(rule).forEach((e) => output.push(e));
    }
    return output;
  }
}

function getPreviousAndNextParentNodes(
  node: DockerOpsNodeType,
  beforeNode: boolean,
  inScript: boolean
): DockerOpsNodeType[] {
  const STOPPER = inScript ? "BASH-SCRIPT" : "DOCKER-FILE";

  const candidates: DockerOpsNodeType[] = [];

  let current = node.parent;
  let previous = node;
  while (current != null) {
    if (current.children.length > 1) {
      const parentIndex = current.children.indexOf(previous);
      current.children
        .filter((_, i) => (beforeNode ? i < parentIndex : i > parentIndex))
        .forEach((node) => candidates.push(node));
    }
    if (current.type == STOPPER) break;
    previous = current;
    current = current.parent;
  }
  return candidates;
}
