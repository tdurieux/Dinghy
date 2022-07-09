import { Command } from "commander";
import { print } from "./lib/ast/docker-printer";
import { Matcher } from "./lib/debloat";
import * as Diff from "diff";

import { RULES } from "./lib/debloat/rules";
import { parseDockerFile } from "./lib/ast/docker-parser";
const program = new Command();

program
  .name("dockerfile-debloat")
  .description("Debloat Dockerfiles")
  .version("1.0.0");

program
  .command("debloat")
  .description("The Dockerfile to debloat")
  .argument("<file>", "The filepath to the Dockerfile")
  .action((file: string) => {
    console.log(file);
  });

program
  .command("parse")
  .description("The Dockerfile to debloat")
  .argument("<file>", "The filepath to the Dockerfile")
  .action((file: string) => {
    const dockerfile = parseDockerFile(file);
    // console.log(JSON.stringify(dockerfile, ["type", "children", "value"], 2));
    const matcher = new Matcher(dockerfile);
    const originalOutput = print(matcher._node, true);
    // console.log(dockerfile.match(gemUpdateNoDocument));
    for (const rule of RULES) {
      const r = matcher.match(rule);
      if (r.violations.length > 0)
        r.violations.map((e) => {
          console.log("[VIOLATION] -> " + e.matched.rule.description);
          console.log(
            "               " +
              print(e.matched.node, true) +
              " at " +
              e.matched.node.position
          );

          if (e.matched.rule.repair) {
            e.matched.rule.repair(e);
          }
        });
    }
    const repairedOutput = print(dockerfile, true);
    const diff = Diff.diffLines(originalOutput, repairedOutput);
    diff.forEach((part) => {
      // green for additions, red for deletions
      // grey for common parts
      const color = part.added ? "green" : part.removed ? "red" : "grey";
      part.value.split("\n").forEach((line) => {
        if (part.added) {
          console.log("+ " + line);
        } else if (part.removed) {
          console.log("- " + line);
        } else {
          console.log(" " + line);
        }
      });
    });

    // console.log(print(dockerfile.enrich().abstract()));
    // dockerfile.traverse((node) => {
    //   const copy = {};
    //   for (const i in node) {
    //     if (["parent", "children"].includes(i) || typeof node[i] == "function")
    //       continue;
    //     copy[i] = node[i];
    //   }
    //   console.log(copy);
    // });
  });

program.parse();
