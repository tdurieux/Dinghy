import { Command, Option } from "commander";
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
  .command("refactor")
  .description("The Dockerfile to debloat")
  .argument("<file>", "The filepath to the Dockerfile")
  .option("-o, --output <output>", "the output destination of the repair")
  .action(async function (file: string, options: { output: string }) {
    const dockerfile = await parseDockerFile(file);
    const matcher = new Matcher(dockerfile);
    const originalOutput = print(matcher._node, true);
    // console.log(dockerfile.match(gemUpdateNoDocument));
    for (const rule of RULES) {
      const r = matcher.match(rule);
      if (r.violations.length > 0)
        r.violations.forEach(async (e) => {
          console.log("[VIOLATION] -> " + e.matched.rule.description);
          console.log(
            "               " +
              print(e.matched.node, true).replace(/\n */g, " ") +
              " at " +
              e.matched.node.position
          );

          if (e.matched.rule.repair) {
            await e.matched.rule.repair(e);
          }
        });
    }
    const repairedOutput = print(matcher.node, true);
    const diff = Diff.diffLines(originalOutput, repairedOutput);

    console.log("The changes:\n");
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
          // console.log(" " + line);
        }
      });
    });
  });

program
  .command("analyze")
  .description("Analyze a Dockerfile file for rule violation")
  .argument("<file>", "The filepath to the Dockerfile")
  .action(async (file: string) => {
    const dockerfile = await parseDockerFile(file);
    const matcher = new Matcher(dockerfile);
    for (const rule of RULES) {
      const r = matcher.match(rule);
      if (r.violations.length > 0)
        r.violations.forEach((e) => {
          console.log("[VIOLATION] -> " + e.matched.rule.description);
          console.log(
            "               " +
              print(e.matched.node, true).replace(/ *\n */g, " ") +
              " at " +
              e.matched.node.position
          );
        });
    }
  });

program
  .command("parse")
  .description("Generate the AST of the dockerfile")
  .argument("<file>", "The filepath to the Dockerfile")
  .action(async (file: string) => {
    const dockerfile = await parseDockerFile(file);
    console.log(
      JSON.stringify(dockerfile, ["type", "children", "value", "position"], 2)
    );
  });

program.parse();
