import { createEnrichers } from "./enrich";
import {
  BashCommandArgs,
  BashCommandCommand,
  BashLiteral,
  DockerOpsNodeType,
  MaybeSemanticCommand,
} from "../ast/docker-type";
import { abstract as abstraction } from "./abstraction";
import { matchRule } from "./rule-matcher";
import { Rule } from "./rules";

export class Matcher {
  _node: DockerOpsNodeType;
  constructor(node: DockerOpsNodeType) {
    this._node = Matcher.abstract(node.clone());
  }

  private static enrich(root: DockerOpsNodeType) {
    const COMMAND_MAP = createEnrichers();

    root.traverse((node) => {
      if (node instanceof MaybeSemanticCommand) {
        const commandAST = node.getElement(BashCommandCommand);
        if (!commandAST) return true;
        commandAST.getElement(BashLiteral);
        const command = commandAST.getElement(BashLiteral)?.value;
        if (COMMAND_MAP[command]) {
          const commandArgs = node
            .getElements(BashCommandArgs)
            .map((e) => e.children)
            .flat();
          const payload = COMMAND_MAP[command](
            commandArgs.map((c) => c.toString()),
            commandArgs
          );
          payload.original = node;
          node.replace(payload);
        }
      }
    });
    return root;
  }

  get node() {
    return this._node;
  }

  private static abstract(root: DockerOpsNodeType) {
    return abstraction(Matcher.enrich(root));
  }

  public match(rule: Rule) {
    console.time(`Match rule: ${rule.name}`);
    const o = matchRule(this._node, rule);
    console.timeEnd(`Match rule: ${rule.name}`);
    return o;
  }
}
