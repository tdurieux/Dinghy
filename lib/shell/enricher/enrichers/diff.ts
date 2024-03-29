import { Argv } from "yargs";
const yargs = require("yargs/yargs");

import { Scenario } from "../enricher-type";

export default {
  providerFor: ["diff"],
  categories: ["DIFF"],
  prefix: "SC-DIFF",
  scenarios: [
    {
      cmd: "$0 [args...]",
      name: "SC-DIFF",
      prefix: "SC-DIFF",
      paths: [],
      booleans: [],
      strings: [],
      counts: [],
      argv: () => {
        return (yargs() as Argv)
          .describe("diff", "SC-DIFF")
          .help(false)
          .version(false)
          .exitProcess(false)
          .showHelpOnFail(false)
          .parserConfiguration({
            "short-option-groups": true,
            "boolean-negation": false,
            "camel-case-expansion": false,
            "parse-numbers": false,
          })
          .command("$0 [args...]", "SC-DIFF")
      }
    },
  ] as Scenario[]
};