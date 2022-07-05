import * as fs from "fs";
import * as yaml from "js-yaml";
import yargs, { Argv } from "yargs";
import { print } from "../ASTPrinter";
import {
  BashLiteral,
  DockerOpsNode,
  DockerOpsNodeType,
  GenericNode,
  Unknown,
} from "../type";

const YAML_DIR = __dirname;

interface Options {
  booleans?: string[];
  strings?: string[];
  paths?: string[];
  arrays?: string[];
  counts?: string[];
  merge?: Options[];
}
interface Scenario {
  cmd: string;
  name: string;
  options: Options;
  fixBadLongNames?: string[];
  captureAllAfter?: {
    name: string;
    match: string[];
  };
  rejectIf?: string[];
  mustHave?: string[];
  replaceEmptyArgsWith?: string[];
  fixupNonSpacedArgs?: boolean;
  stealFromArrayFor?: {
    array: string;
    for: string;
  };
  saveLastNonOption?: string;
  rejectIfIs?: {
    name: string;
    values: string[];
  };
  captureAfterThirdNonOption?: string;
  captureAfterSecondNonOption?: string;
  captureAfterFirstNonOption?: string;
}
interface Command {
  prefix: string;
  providerFor: string[];
  options: Options;
  scenarios: Scenario[];
}
interface CommandFile {
  command: Command;
}

function processArg(arg: string): [short: string, long?: string] {
  if (arg.indexOf(",") === -1) {
    return [arg.trim().replace(/^--?/, "")];
  }

  const parts = arg.split(",");
  const short = parts[0].trim().replace(/^--?/, "");
  const long = parts[1].trim().replace(/^--?/, "");
  return [short, long];
}

function getArgsFromList(list: string[] = []) {
  return list.map(processArg).flat();
}

function addToArgv(
  arg: string,
  argv: yargs.Argv<{}>,
  adder: <K extends string>(
    key: K | ReadonlyArray<K>
  ) => Argv<{ [key in K]: number | string | boolean }>
) {
  const out = processArg(arg);
  if (out.length == 1) return adder.call(argv, out[0]);
  return adder.call(argv, out[0]).alias(out[0], out[1]);
}

const getOptions = (scenario: Scenario) => {
  if (scenario.options.merge) {
    const options = {
      booleans: [],
      strings: [],
      paths: [],
      arrays: [],
      counts: [],
    } as Options;

    options.booleans = scenario.options.merge
      .map((opt) => opt.booleans || [])
      .flat();
    options.strings = scenario.options.merge
      .map((opt) => opt.strings || [])
      .flat();
    options.paths = scenario.options.merge.map((opt) => opt.paths || []).flat();
    options.arrays = scenario.options.merge
      .map((opt) => opt.arrays || [])
      .flat();
    options.counts = scenario.options.merge
      .map((opt) => opt.counts || [])
      .flat();

    return options;
  }

  return scenario.options;
};

function getValuedOptions(argv: yargs.Argv<{}>): string[] {
  const theOpts: { [key: string]: any } = (argv as any).getOptions();

  return theOpts.string
    .concat(theOpts.array)
    .map((opt: string) =>
      theOpts.alias[opt] ? theOpts.alias[opt].concat([opt]) : opt
    )
    .flat();
}

/**
 * Check if flag is in args
 * @param flag command flag
 * @param args command passed args
 * @returns true if the flag is in args
 */
function matchFlag(flag: string, args: string[]) {
  if (args.indexOf(flag.trim()) !== -1) {
    return true;
  }

  // Support -axfsfsdg style
  for (let i = 0; i < args.length; i++) {
    if (/^-\w/.test(args[i]) && flag.replace("-", "").trim().length === 1) {
      if (args[i].indexOf(flag.replace("-", "").trim()) !== -1) {
        return true;
      }
    }
  }

  return false;
}

type ScenarioParserOutput = {
  $: {
    prefix?: string;
    args: string[];
    captures: string[];
    originalArgs: string[];
    paths: string[];
    counts: string[];
    options: { [key: string]: any };
    name: string;
    cmd: string;
  };
  $0: string;
  _: (string | number)[];6
  [key: string]: any;
};
function buildScenarioParser(
  scenario: Scenario
): (args: string[]) => ScenarioParserOutput {
  return (args: string[]) => {
    // Save these
    const originalArgs = args;

    // // Dirty require.cache trickery
    for (const i in require.cache) {
      if (i.includes("yargs")) delete require.cache[i];
    }
    delete require.cache["/usr/local/lib/node_modules/yargs/index.js"];
    // let yargs = require("yargs");

    // Look at scenario.cmd and do some checking
    const checkScenarioValidity = (args: string[]) => {
      const parts = scenario.cmd.split(/ /g);

      // Check early rejection
      if (scenario.rejectIf) {
        if (scenario.rejectIf.some((a) => args.indexOf(a) !== -1)) {
          return false;
        }
      }

      let valid = true;

      if (
        parts.length > 1 &&
        !parts[1].trim().startsWith("<") &&
        !parts[1].trim().startsWith("[")
      ) {
        valid = valid && args.indexOf(parts[1].trim()) !== -1;
      }

      if (scenario.mustHave && scenario.mustHave.length > 0) {
        valid =
          valid && scenario.mustHave.every((flag) => matchFlag(flag, args));
      }

      return valid;
    };

    // Set all of these properties up so we have controllable
    // behavior from argv
    let argv = ((yargs as any)() as Argv)
      .help(false)
      .version(false)
      .exitProcess(false)
      .showHelpOnFail(false)
      .parserConfiguration({
        "boolean-negation": false,
        "camel-case-expansion": false,
      })
      .fail((a, b, c) => {
        console.error(b);
        throw new Error(
          "Arg parsing failed. " + originalArgs.join(" ") + "\n" + a
        );
      })
      .command(scenario.cmd, scenario.name);

    // Go through and add the info in the yaml to the parser
    const options = getOptions(scenario);

    if (options.booleans && options.booleans.length >= 1) {
      argv = options.booleans.reduce(
        (argv, arg) => addToArgv(arg, argv, argv.boolean),
        argv
      );
    }
    if (options.strings && options.strings.length >= 1) {
      argv = options.strings.reduce(
        (argv, arg) => addToArgv(arg, argv, argv.string),
        argv
      );
    }
    if (options.paths && options.paths.length >= 1) {
      argv = options.paths.reduce(
        (argv, arg) => addToArgv(arg, argv, argv.string),
        argv
      );
    }
    if (options.arrays && options.arrays.length >= 1) {
      argv = options.arrays.reduce(
        (argv, arg) => addToArgv(arg, argv, argv.array),
        argv
      );
    }
    if (options.counts && options.counts.length >= 1) {
      argv = options.counts.reduce(
        (argv, arg) => addToArgv(arg, argv, argv.count),
        argv
      );
    }

    const valuedOpts = getValuedOptions(argv)
      .map((opt) => [`-${opt}`, `--${opt}`])
      .flat();

    // Sometimes we have a default arg if we are passed none (like cd ...)
    if (scenario.replaceEmptyArgsWith && args.length === 0) {
      args = scenario.replaceEmptyArgsWith;
    }

    // Sometimes args have no spaces... (like cmade -DTHIS_OPTION=FALSE)
    // UGH: -buildmode=pie ... this mixes bad long names and fixupNonSpace
    if (scenario.fixupNonSpacedArgs) {
      args = args
        .map((arg) => {
          const selections = getValuedOptions(argv);
          for (const selection of selections) {
            const matches =
              arg !== selection &&
              (arg.startsWith(`-${selection}`) ||
                arg.startsWith(`--${selection}`));

            if (matches) {
              const leftovers = arg.replace(/^--?${selection}\=?/, "");

              if (leftovers.length === 0) {
                return [arg];
              }

              return [arg.slice(0, arg.indexOf(leftovers)), leftovers];
            }
          }

          return [arg];
        })
        .flat();
    }

    // Handle this (might want to feature gate this, remains to be seen)
    args = args.map((arg) =>
      arg.startsWith("-") ? arg.replace(/\=$/, "") : arg
    );

    // Some commands have bad long names (like find -name '*.foo')
    if (scenario.fixBadLongNames) {
      args = args.map((arg) => {
        return scenario.fixBadLongNames.indexOf(arg) === -1 ? arg : `-${arg}`;
      });
    }

    const captures: string[] = [];
    let captureAfterN =
      scenario.captureAfterFirstNonOption ||
      scenario.captureAfterSecondNonOption ||
      scenario.captureAfterThirdNonOption;

    // Some commands have flags that start a capture of all the rest
    // of the arguments (like find -exec ...)
    if (scenario.captureAllAfter) {
      let capturing = false;
      const newArgs: string[] = [];

      for (let i = 0; i < args.length; i++) {
        if (capturing) {
          captures.push(args[i]);
          continue;
        }

        if (scenario.captureAllAfter.match.indexOf(args[i]) !== -1) {
          capturing = true;
        }

        newArgs.push(args[i]);
      }

      args = newArgs;
    } else if (captureAfterN) {
      captureAfterN = captureAfterN.trim();

      let capturing = false;
      let skipNext = false;
      const newArgs = [];

      for (let i = 0; i < args.length; i++) {
        if (capturing) {
          captures.push(args[i]);
          continue;
        }

        if (skipNext) {
          newArgs.push(args[i]);
          skipNext = false;
          continue;
        }

        if (!args[i].startsWith("-")) {
          capturing = true;
          captures.push(args[i]);
          continue;
        }

        skipNext = valuedOpts.indexOf(args[i]) !== -1;
        newArgs.push(args[i]);
      }

      args = newArgs;
    }

    // Possibly reclaim on or two args
    if (scenario.captureAfterSecondNonOption && captures.length >= 1) {
      args.push(captures.shift());
    } else if (scenario.captureAfterThirdNonOption && captures.length >= 2) {
      args.push(captures.shift());
      args.push(captures.shift());
    }

    // Sometimes we don't want to run a given scenario for
    // many possible reasons
    if (!checkScenarioValidity(args)) {
      throw new Error("Scenario not applicable.");
    }

    let saveLastNonOption: string | null = null;

    if (scenario.saveLastNonOption && args.length > 0) {
      if (
        !args[args.length - 1].startsWith("-") &&
        valuedOpts.indexOf(args[args.length - 2]) === -1
      ) {
        saveLastNonOption = args[args.length - 1];
        args.pop();
      }
    }

    // console.log(JSON.stringify(argv.getOptions(), null, 2));
    const results = argv.parse(args) as {
      [x: string]: any;
      _: (string | number)[];
      $0: string;
    };

    // This validity predicate can't be checked until after we've tried the parse
    if (scenario.rejectIfIs) {
      if (results[scenario.rejectIfIs.name]) {
        if (
          scenario.rejectIfIs.values.indexOf(
            results[scenario.rejectIfIs.name]
          ) !== -1
        ) {
          throw new Error("Scenario not applicable");
        }
      }
    }

    // Array in argv is too greedy sometimes
    if (
      scenario.stealFromArrayFor &&
      results[scenario.stealFromArrayFor.array] &&
      results[scenario.stealFromArrayFor.array].length > 0
    ) {
      if (!results[scenario.stealFromArrayFor.for]) {
        results[scenario.stealFromArrayFor.for] =
          results[scenario.stealFromArrayFor.array].pop();
      } else if (results[scenario.stealFromArrayFor.for].length === 0) {
        results[scenario.stealFromArrayFor.for].push(
          results[scenario.stealFromArrayFor.array].pop()
        );
      }
    }

    const failedCommandValidation = scenario.cmd
      .split(" ")
      .filter(
        (x) => !x.startsWith("$") && !x.startsWith("[") && !x.startsWith("<")
      )
      .some((x) => results[x.trim()] !== true && results[x.trim()] != x.trim());
    // Another check that we have to do AFTER parsing
    if (failedCommandValidation) {
      throw new Error("Scenario not applicable");
    }

    // Add back special capture-after arguments
    if (scenario.captureAllAfter && captures && captures.length > 0) {
      if (!results[scenario.captureAllAfter.name.trim()]) {
        results[scenario.captureAllAfter.name.trim()] = captures;
      } else {
        results[scenario.captureAllAfter.name.trim()].push(...captures);
      }
    } else if (captureAfterN && captures && captures.length > 0) {
      if (!results[captureAfterN]) {
        results[captureAfterN] = captures;
      } else {
        results[captureAfterN].push(...captures);
      }
    }

    if (saveLastNonOption) {
      results[scenario.saveLastNonOption] = saveLastNonOption;
    }

    // Capture this for post processing
    results["$"] = {
      args,
      captures,
      originalArgs,
      paths: getArgsFromList(options.paths),
      counts: getArgsFromList(options.counts),
      options: (argv as any).getOptions(),
      name: scenario.name,
      cmd: scenario.cmd,
    };

    return results as ScenarioParserOutput;
  };
}

function buildParser(
  prefix: string,
  scenarios: Scenario[]
): (args: string[]) =>
  | {
      scenario: null;
      result: DockerOpsNodeType;
    }
  | {
      scenario: Scenario;
      result: ScenarioParserOutput;
    } {
  return (args: string[]) => {
    const parsers = scenarios.map(buildScenarioParser);

    for (let i = 0; i < parsers.length; i++) {
      try {
        const result = parsers[i](args);
        result.$.prefix = prefix;
        return { scenario: scenarios[i], result };
      } catch (e) {
        if (e.message != "Scenario not applicable.") console.error(e);
        continue;
      }
    }

    return { scenario: null, result: new Unknown() };
  };
}

function nodify(
  prefix: string,
  type: string,
  key: string | string[],
  value: string,
  opts: any,
  paths: string[],
  oargs: {
    [x: string]: DockerOpsNodeType;
  }
): DockerOpsNodeType {
  function reify(v: string | number, def: DockerOpsNodeType[]) {
    return oargs[v] ? [oargs[v]] : def || [];
  }

  if (typeof key == "string" && paths.indexOf(key) !== -1) {
    const out = new GenericNode(`${prefix}-${type}`).addChild(
      new GenericNode(`BASH-PATH`)
    );

    reify(value as string, [new BashLiteral(value)]).forEach((e) =>
      out.children[0].addChild(e)
    );
    return out;
  } else if (opts.boolean.indexOf(key) !== -1) {
    return new GenericNode(`${prefix}-F-${type}`);
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      return new Unknown();
    }
    if (!type.endsWith("S")) {
      type = type + "S";
    }
    const out = new GenericNode(`${prefix}-${type}`);
    value.forEach((x) => {
      const child = new GenericNode(`${prefix}-${type.slice(0, -1)}`);
      reify(x, [new BashLiteral(x)]).forEach((e) => child.addChild(e));
      out.addChild(child);
    });

    return out;
  } else if (opts.string.indexOf(key) !== -1) {
    const out = new GenericNode(`${prefix}-${type}`);
    reify(value, [new BashLiteral(value)]).forEach((e) => out.addChild(e));
  } else if (typeof value === "string" || typeof value === "number") {
    const out = new GenericNode(`${prefix}-${type}`);
    reify(value, [new BashLiteral(value.toString())]).forEach((e) =>
      out.addChild(e)
    );
  }

  return new GenericNode(`${prefix}-${type}`);
}

const buildPostProcessor =
  (parser: ReturnType<typeof buildParser>) =>
  (argsString: string[], argsAST: DockerOpsNodeType[]): DockerOpsNodeType => {
    const output = parser(argsString);

    if (output.result instanceof DockerOpsNode) {
      return output.result;
    }

    const argsASTCache = argsAST
      .map((child) => ({ [print(child)]: child }))
      .reduce((obj, cur) => ({ ...obj, ...cur }), {});

    const details = output.result.$;

    const aliases = details.options.alias;

    Object.keys(aliases).forEach((k1) => {
      Object.keys(aliases).forEach((k2) => {
        if (k1 === k2) {
          return;
        }
        if (
          aliases[k1].length === aliases[k2].length &&
          aliases[k1].every((x, i) => x === aliases[k2][i])
        ) {
          aliases[k1].push(k2);
          aliases[k2].push(k1);
        }
      });
    });

    Object.keys(aliases).forEach(
      (k) => (aliases[k] = aliases[k].sort((a, b) => b.length - a.length))
    );

    const subtree = new GenericNode(details.name);

    const ignores = details.cmd
      .split(" ")
      .filter((x: string) => !x.startsWith("[") && !x.startsWith("<"))
      .concat(["$", "_"]);

    ignores.push(
      ...details.counts.filter((c: string) => output.result[c] === 0)
    );

    subtree.children = Object.keys(output.result)
      .filter(
        (k) =>
          // Maybe we've already processed or want to ignore this key
          ignores.indexOf(k) === -1
      )
      .map((k) => {
        // Okay, get a "good" name for this key
        // Then remove all possible aliases
        if (aliases[k]) {
          ignores.push(...aliases[k]);
          return nodify(
            details.prefix,
            aliases[k][0].toUpperCase(),
            k,
            output.result[k],
            details.options,
            details.paths,
            argsASTCache
          );
        } else if (
          Object.keys(aliases).some(
            (x) => aliases[x].indexOf(k) !== -1 && output.result[x]
          )
        ) {
          return null; // Just skip, we'll hit this later
        } else {
          ignores.push(k);
          return nodify(
            details.prefix,
            k.toUpperCase(),
            k,
            output.result[k],
            details.options,
            details.paths,
            argsASTCache
          );
        }
      })
      .filter((x) => x);

    return subtree;
  };

export function createEnrichers(): {
  [key: string]: ReturnType<typeof buildPostProcessor>;
} {
  const out = fs
    .readdirSync(`${YAML_DIR}`)
    .filter((x) => x.endsWith(".yml"))
    .map((fname) => {
      const command = (
        yaml.load(
          fs.readFileSync(`${YAML_DIR}/${fname}`, "utf8")
        ) as CommandFile
      ).command;
      return command.providerFor.map((commandName: string) => ({
        [commandName]: buildPostProcessor(
          buildParser(command.prefix, command.scenarios)
        ),
      }));
    })
    .reduce(
      (obj, cur) => cur.reduce((obj, cur) => ({ ...obj, ...cur }), obj),
      {}
    );
  return out;
}
