import { abstract as abstraction } from "./abstraction";
import { print } from "../ast/docker-pretty-printer";
import {
  BashLiteral,
  DockerOpsNodeType,
  DockerOpsValueNode,
  MaybeSemanticCommand,
} from "../ast/docker-type";
import { createEnrichers } from "./cmd-enricher";

export function enrich(root: DockerOpsNodeType) {
  const COMMAND_MAP = createEnrichers();

  root.traverse(
    (node) => {
      if (node instanceof MaybeSemanticCommand) {
        const commandAST = node.command;
        if (!commandAST) return true;

        const command = commandAST.getElement(BashLiteral)?.value;
        if (!command) return true;

        if (COMMAND_MAP[command]) {
          const commandArgs = node.args.filter((e) => {
            return e.traverse(
              (e) => {
                if (e instanceof DockerOpsValueNode && e.value?.trim() == "--")
                  return false;
              },
              { includeSelf: true }
            );
          });

          // enrich the arguments of the command
          COMMAND_MAP[command](
            node,
            commandArgs.map((c) => print(c).trim()),
            commandArgs
          );
        }
      }
    },
    { includeSelf: true }
  );
  return root;
}

/**
 * Abstract the node as a pre-step for the matching
 * @param root
 * @returns
 */
export function abstract(root: DockerOpsNodeType) {
  return abstraction(enrich(root));
}
