import { Command, Option } from "commander";
import { print } from "./lib/ast/docker-printer";
import { Matcher } from "./lib/debloat/rule-matcher";
import { DockerParser } from "./lib/ast/docker-parser";
import * as Diff from "diff";

import { RULES } from "./lib/debloat/rules";
import { parseDocker } from "./lib/ast/docker-parser";
import File from "./lib/ast/file";
const program = new Command();

program
  .name("dockerfile-debloat")
  .description("Debloat Dockerfiles")
  .version("1.0.0");

program
  .command("rules")
  .description("List the supported rules")
  .action(async function () {
    for (const rule of RULES) {
      console.log(rule.name);
      console.log(rule.description);
    }
  });

program
  .command("refactor")
  .description("The Dockerfile to debloat")
  .argument("<file>", "The filepath to the Dockerfile")
  .option("-o, --output <output>", "the output destination of the repair")
  .action(async function (file: string, options: { output: string }) {
    const parser = new DockerParser(new File(file));
    const dockerfile = await parser.parse();
    const matcher = new Matcher(dockerfile);
    const originalOutput = print(matcher.node, true);
    matcher.matchAll().forEach(async (e) => {
      console.log(e.toString());
      await e.repair();
    });
    const repairedOutput = print(matcher.node, true);
    const diff = Diff.diffLines(parser.file.content, repairedOutput);

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
    const dockerfile = await parseDocker(file);
    const matcher = new Matcher(dockerfile);
    matcher.matchAll().forEach((e) => console.log(e.toString()));
  });

program
  .command("parse")
  .description("Generate the AST of the dockerfile")
  .argument("<file>", "The filepath to the Dockerfile")
  .action(async (file: string) => {
    const dockerfile = await parseDocker(file);
    console.log(
      JSON.stringify(dockerfile, ["type", "children", "value", "position"], 2)
    );
  });

program.parse();
