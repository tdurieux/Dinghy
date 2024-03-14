import { AbstractNode } from "../../core/core-types";
import { abstract as abstraction } from "./abstraction";
import { enrich as enricher } from "./enricher";

/**
 * The list of supported commands
 */
export { enrichers as supportedCommands } from "./enrichers";

/**
 * Enrich the node with command information
 * @param root
 * @returns
 */
export function enrich<T extends AbstractNode<any>>(root: T) {
  return enricher(root);
}

/**
 * Abstract the node as a pre-step for the matching
 * @param root
 * @returns
 */
export function abstract<T extends AbstractNode<any>>(root: T) {
  return abstraction(root);
}

/**
 * Enrich and abstract the node
 * @param node the node to enrich and abstract
 * @returns the enriched and abstracted node
 */
export default <T extends AbstractNode<any>>(node: T) => {
  return abstract(enrich(node));
};
