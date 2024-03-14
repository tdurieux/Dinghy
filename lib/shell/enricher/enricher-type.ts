import { Argv } from "yargs";

export interface Options {
  booleans?: string[];
  strings?: string[];
  paths?: string[];
  arrays?: string[];
  counts?: string[];
  merge?: Options[];
}

export interface ScenarioConfig extends Scenario {
  options: Options;
}

export interface Scenario {
  fixBadLongNames?: string[];
  captureAllAfter?: {
    name: string;
    match: string[];
  };
  rejectIf?: string[];
  mustHave?: string[];
  replaceEmptyArgsWith?: string[];
  fixupBadFlag?: boolean;
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
  postProcess?: {
    tagLastElement?: {
      source: string;
      tag: string;
    };
    subCommand?: string;
  }[];
  // detailed: (args: string[]) => DetailedArguments;
  argv: () => Argv;
  cmd: string;
  name: string;
  categories?: string[];
  prefix: string;
  // tags: string[];
  paths?: string[];
  strings?: string[];
  booleans?: string[];
  counts?: string[];
}
export interface Command {
  prefix: string;
  categories?: string[];
  providerFor: string[];
  options: Options;
  scenarios: ScenarioConfig[];
}
export interface CommandFile {
  command: Command;
}

export interface Enricher {
  providerFor: string[];
  prefix: string;
  scenarios: Scenario[];
  categories: string[];
}
