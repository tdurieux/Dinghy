import { Command } from "commander";
import { readFileSync } from "fs";
import { parseDocker } from "./lib/ast";
import { print } from "./lib/ast/ASTPrinter";
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
