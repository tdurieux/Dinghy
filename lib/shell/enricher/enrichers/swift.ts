import { Argv } from "yargs";
const yargs = require("yargs/yargs");

import { Scenario } from "../enricher-type";

export default {
  providerFor: ["swift"],
  categories: ["DEVELOPMENT"],
  prefix: "SC-SWIFT",
  scenarios: [
    {
      cmd: "$0",
      name: "SC-SWIFT",
      prefix: "SC-SWIFT",
      booleans: ["color-diagnostics","disable-clang-target","enable-builtin-module","gdwarf-types","gline-tables-only","gnone","g","help","index-include-locals","link-objc-runtime","no-color-diagnostics","no-warnings-as-errors","nostdimport","Onone","Osize","Ounchecked","O","pretty-print","print-target-info","Rcross-import","Rmodule-loading","Rpass-missed=<value>","Rpass=<value>","static-executable","static-stdlib","suppress-remarks","suppress-warnings","use-ld=<value>","version","v","warn-concurrency","warnings-as-errors"],
      strings: ["access-notes-path","allowable-client","assert-config","clang-build-session-file","clang-target","continue-building-after-errors","coverage-prefix-map","cxx-interoperability-mode=<value>","debug-info-format=<value>","debug-info-store-invocation","debug-prefix-map","diagnostic-style","disable-actor-data-race-checks","disable-autolinking-runtime-compatibility-concurrency","disable-autolinking-runtime-compatibility-dynamic-replacements","disable-autolinking-runtime-compatibility","disable-incremental-imports","disable-only-one-dependency-file","disallow-use-new-driver","D","embed-tbd-for-module","emit-module-dependencies-path","emit-module-serialize-diagnostics-path","enable-actor-data-race-checks","enable-autolinking-runtime-compatibility-bytecode-layouts","enable-bare-slash-regex","enable-experimental-additive-arithmetic-derivation","enable-experimental-concise-pound-file","enable-experimental-feature","enable-experimental-forward-mode-differentiation","enable-incremental-imports","enable-library-evolution","enable-only-one-dependency-file","enable-upcoming-feature","enforce-exclusivity=<enforcement>","explain-module-dependency","export-as","external-plugin-path","e","file-compilation-dir","file-prefix-map","framework","Fsystem","F","index-ignore-clang-modules","index-store-path","index-unit-output-path","I","j","libc","load-plugin-executable","load-plugin-library","locale","localization-path","L","l","module-abi-name","module-alias","module-cache-path","module-link-name","module-name","num-threads","package-name","plugin-path","prefix-serialized-debugging-options","print-educational-notes","remove-runtime-asserts","Rindexing-system-module","Rskip-explicit-interface-build","runtime-compatibility-version","save-optimization-record-passes","save-optimization-record-path","save-optimization-record=<format>","save-optimization-record","sdk","serialize-diagnostics-path","strict-concurrency=<value>","swift-isa-ptrauth-mode","swift-ptrauth-mode","swift-version","target-cpu","target-min-inlining-version","target-variant","target","user-module-version","validate-clang-modules-once","vfsoverlay","visualc-tools-root","visualc-tools-version","warn-implicit-overrides","warn-swift3-objc-inference-complete","warn-swift3-objc-inference-minimal","windows-sdk-root","windows-sdk-version","working-directory","Xcc","Xlinker"],
      argv: () => {
        return (yargs() as Argv)
          .describe("swift", "SC-SWIFT")
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
          .command("$0", "SC-SWIFT")
          .option("color-diagnostics", {"type":"boolean"})
          .option("disable-clang-target", {"type":"boolean"})
          .option("enable-builtin-module", {"type":"boolean"})
          .option("gdwarf-types", {"type":"boolean"})
          .option("gline-tables-only", {"type":"boolean"})
          .option("gnone", {"type":"boolean"})
          .option("g", {"type":"boolean"})
          .option("help", {"type":"boolean"})
          .option("index-include-locals", {"type":"boolean"})
          .option("link-objc-runtime", {"type":"boolean"})
          .option("no-color-diagnostics", {"type":"boolean"})
          .option("no-warnings-as-errors", {"type":"boolean"})
          .option("nostdimport", {"type":"boolean"})
          .option("Onone", {"type":"boolean"})
          .option("Osize", {"type":"boolean"})
          .option("Ounchecked", {"type":"boolean"})
          .option("O", {"type":"boolean"})
          .option("pretty-print", {"type":"boolean"})
          .option("print-target-info", {"type":"boolean"})
          .option("Rcross-import", {"type":"boolean"})
          .option("Rmodule-loading", {"type":"boolean"})
          .option("Rpass-missed=<value>", {"type":"boolean"})
          .option("Rpass=<value>", {"type":"boolean"})
          .option("static-executable", {"type":"boolean"})
          .option("static-stdlib", {"type":"boolean"})
          .option("suppress-remarks", {"type":"boolean"})
          .option("suppress-warnings", {"type":"boolean"})
          .option("use-ld=<value>", {"type":"boolean"})
          .option("version", {"type":"boolean"})
          .option("v", {"type":"boolean"})
          .option("warn-concurrency", {"type":"boolean"})
          .option("warnings-as-errors", {"type":"boolean"})
          .option("access-notes-path", {"type":"string"})
          .option("allowable-client", {"type":"string"})
          .option("assert-config", {"type":"string"})
          .option("clang-build-session-file", {"type":"string"})
          .option("clang-target", {"type":"string"})
          .option("continue-building-after-errors", {"type":"string"})
          .option("coverage-prefix-map", {"type":"string"})
          .option("cxx-interoperability-mode=<value>", {"type":"string"})
          .option("debug-info-format=<value>", {"type":"string"})
          .option("debug-info-store-invocation", {"type":"string"})
          .option("debug-prefix-map", {"type":"string"})
          .option("diagnostic-style", {"type":"string"})
          .option("disable-actor-data-race-checks", {"type":"string"})
          .option("disable-autolinking-runtime-compatibility-concurrency", {"type":"string"})
          .option("disable-autolinking-runtime-compatibility-dynamic-replacements", {"type":"string"})
          .option("disable-autolinking-runtime-compatibility", {"type":"string"})
          .option("disable-incremental-imports", {"type":"string"})
          .option("disable-only-one-dependency-file", {"type":"string"})
          .option("disallow-use-new-driver", {"type":"string"})
          .option("D", {"type":"string"})
          .option("embed-tbd-for-module", {"type":"string"})
          .option("emit-module-dependencies-path", {"type":"string"})
          .option("emit-module-serialize-diagnostics-path", {"type":"string"})
          .option("enable-actor-data-race-checks", {"type":"string"})
          .option("enable-autolinking-runtime-compatibility-bytecode-layouts", {"type":"string"})
          .option("enable-bare-slash-regex", {"type":"string"})
          .option("enable-experimental-additive-arithmetic-derivation", {"type":"string"})
          .option("enable-experimental-concise-pound-file", {"type":"string"})
          .option("enable-experimental-feature", {"type":"string"})
          .option("enable-experimental-forward-mode-differentiation", {"type":"string"})
          .option("enable-incremental-imports", {"type":"string"})
          .option("enable-library-evolution", {"type":"string"})
          .option("enable-only-one-dependency-file", {"type":"string"})
          .option("enable-upcoming-feature", {"type":"string"})
          .option("enforce-exclusivity=<enforcement>", {"type":"string"})
          .option("explain-module-dependency", {"type":"string"})
          .option("export-as", {"type":"string"})
          .option("external-plugin-path", {"type":"string"})
          .option("e", {"type":"string"})
          .option("file-compilation-dir", {"type":"string"})
          .option("file-prefix-map", {"type":"string"})
          .option("framework", {"type":"string"})
          .option("Fsystem", {"type":"string"})
          .option("F", {"type":"string"})
          .option("index-ignore-clang-modules", {"type":"string"})
          .option("index-store-path", {"type":"string"})
          .option("index-unit-output-path", {"type":"string"})
          .option("I", {"type":"string"})
          .option("j", {"type":"string"})
          .option("libc", {"type":"string"})
          .option("load-plugin-executable", {"type":"string"})
          .option("load-plugin-library", {"type":"string"})
          .option("locale", {"type":"string"})
          .option("localization-path", {"type":"string"})
          .option("L", {"type":"string"})
          .option("l", {"type":"string"})
          .option("module-abi-name", {"type":"string"})
          .option("module-alias", {"type":"string"})
          .option("module-cache-path", {"type":"string"})
          .option("module-link-name", {"type":"string"})
          .option("module-name", {"type":"string"})
          .option("num-threads", {"type":"string"})
          .option("package-name", {"type":"string"})
          .option("plugin-path", {"type":"string"})
          .option("prefix-serialized-debugging-options", {"type":"string"})
          .option("print-educational-notes", {"type":"string"})
          .option("remove-runtime-asserts", {"type":"string"})
          .option("Rindexing-system-module", {"type":"string"})
          .option("Rskip-explicit-interface-build", {"type":"string"})
          .option("runtime-compatibility-version", {"type":"string"})
          .option("save-optimization-record-passes", {"type":"string"})
          .option("save-optimization-record-path", {"type":"string"})
          .option("save-optimization-record=<format>", {"type":"string"})
          .option("save-optimization-record", {"type":"string"})
          .option("sdk", {"type":"string"})
          .option("serialize-diagnostics-path", {"type":"string"})
          .option("strict-concurrency=<value>", {"type":"string"})
          .option("swift-isa-ptrauth-mode", {"type":"string"})
          .option("swift-ptrauth-mode", {"type":"string"})
          .option("swift-version", {"type":"string"})
          .option("target-cpu", {"type":"string"})
          .option("target-min-inlining-version", {"type":"string"})
          .option("target-variant", {"type":"string"})
          .option("target", {"type":"string"})
          .option("user-module-version", {"type":"string"})
          .option("validate-clang-modules-once", {"type":"string"})
          .option("vfsoverlay", {"type":"string"})
          .option("visualc-tools-root", {"type":"string"})
          .option("visualc-tools-version", {"type":"string"})
          .option("warn-implicit-overrides", {"type":"string"})
          .option("warn-swift3-objc-inference-complete", {"type":"string"})
          .option("warn-swift3-objc-inference-minimal", {"type":"string"})
          .option("windows-sdk-root", {"type":"string"})
          .option("windows-sdk-version", {"type":"string"})
          .option("working-directory", {"type":"string"})
          .option("Xcc", {"type":"string"})
          .option("Xlinker", {"type":"string"})
      }
    },
  ] as Scenario[]
};