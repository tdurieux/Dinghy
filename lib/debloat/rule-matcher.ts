import { Antecedent, Match, Rule } from "./rules";
import { DockerOpsNodeType } from "../ast/docker-type";

export function matchRule(node: DockerOpsNodeType, rule: Rule) {
  const violations: {
    description: string;
    matched: {
      node: DockerOpsNodeType;
      rule: Rule;
    };
  }[] = [];
  const stats: {
    [key: string]: {
      matches: number;
      noConfirmations: number;
      violations: number;
    };
  } = {};

  stats[rule.name] = { matches: 0, noConfirmations: 0, violations: 0 };

  node.traverse((node) => {
    const env: { bound: DockerOpsNodeType[] } = { bound: [] };
    if (isRuleMatchNode(node, rule.antecedent, env)) {
      stats[rule.name].matches++;

      if (rule.kind !== "CONSEQUENT-FLAG-OF-ANTECEDENT") {
        env.bound = getAllParentBeforeOrAfterOfNode(
          node,
          rule.kind === "CONSEQUENT-PRECEDES-ANTECEDENT",
          rule.scope === "INTRA-DIRECTIVE"
        );
      }

      if (rule.consequent.matchAnyBound) {
        if (
          !env.bound.some((candidate) => {
            // check the top level and then check the children
            if (
              isRuleMatchNode(candidate, rule.consequent.matchAnyBound, env)
            ) {
              return true;
            }
            // if not everything has be traversed it means that a match has been found
            return !candidate.traverse((node) => {
              if (isRuleMatchNode(node, rule.consequent.matchAnyBound, env)) {
                return false;
              }
            });
          })
        ) {
          stats[rule.name].violations += 1;
          violations.push({
            description: rule.description,
            matched: {
              node,
              rule,
            },
          });
        } else {
          stats[rule.name].noConfirmations += 1;
        }
      } else {
        violations.push({
          description: rule.description,
          matched: {
            node,
            rule,
          },
        });
      }
    }
  });

  return { stats, violations };
}

function isRuleMatchNode(
  node: DockerOpsNodeType,
  rule: Antecedent | Match,
  env: { bound: DockerOpsNodeType[] }
) {
  if (node.type !== rule.type) {
    return false;
  }
  if ((rule as Antecedent).bindHere === true) {
    env.bound = node.children;
  }
  if (rule.children) {
    return rule.children.every((toMatchChild) =>
      node.children.some((currentChild) =>
        isRuleMatchNode(currentChild, toMatchChild, env)
      )
    );
  }
  return true;
}

function getAllParentBeforeOrAfterOfNode(
  node: DockerOpsNodeType,
  before: boolean,
  intra: boolean
): DockerOpsNodeType[] {
  const candidates: DockerOpsNodeType[] = [];
  const STOPPER = intra ? "BASH-SCRIPT" : "DOCKER-FILE";

  let current = node.parent;
  let previous = node;
  while (current != null) {
    if (current.children.length > 1) {
      const parentIndex = current.children.indexOf(previous);
      current.children
        .filter((_, i) => (before ? i < parentIndex : i > parentIndex))
        .forEach((node) => candidates.push(node));
    }
    if (current.type == STOPPER) break;
    previous = current;
    current = current.parent;
  }
  return candidates;
}
