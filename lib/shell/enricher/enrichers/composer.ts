import { Argv } from "yargs";
const yargs = require("yargs/yargs");

import { Scenario } from "../enricher-type";

export default {
  providerFor: ["composer"],
  categories: ["PACKAGE_MANAGEMENT"],
  prefix: "SC-COMPOSER",
  scenarios: [
    {
      cmd: "$0 [args...]",
      name: "SC-COMPOSER",
      prefix: "SC-COMPOSER",
      paths: [],
      booleans: [],
      strings: [],
      counts: [],
      argv: () => {
        return (yargs() as Argv)
          .describe("composer", "SC-COMPOSER")
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
          .command("$0 [args...]", "SC-COMPOSER")
      }
    },
  ] as Scenario[]
};