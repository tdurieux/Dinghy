import { Command } from "commander";
import { readFileSync } from "fs";
import { parseDocker } from "./lib/ast";
import { print } from "./lib/ast/ASTPrinter";
import {
  gemUpdateNoDocument,
  mkdirUsrSrcThenRemove,
  RULES,
} from "./lib/ast/rule";
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
    const data = readFileSync(file, "utf8");
    const dockerfile = parseDocker(data);
    // console.log(JSON.stringify(dockerfile, ["type", "children", "value"], 2));
    console.log(print(dockerfile));
    // console.log(dockerfile.match(gemUpdateNoDocument));
    for (const rule of RULES) {
      const r = dockerfile.match(rule);
      if (r.violations.length > 0)
        r.violations.map((e) => {
          console.log("[VIOLATION] -> " + e.matched.rule.description);
          console.log(
            "               " +
              (e.matched.node.original
                ? e.matched.node.original.toString()
                : e.matched.node.toString()) +
              " at " +
              e.matched.node.position
          );
        });
    }
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
