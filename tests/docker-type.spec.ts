import { parseDocker } from "../lib/docker/docker-parser";
import { Q } from "../lib/core/core-types";
import { BashLiteral, BashScript, BashWord } from "../lib/shell/shell-types";
import { AllDockerNodes, DockerFile, DockerRun } from "../lib/docker/docker-types";

describe("Testing docker-types", () => {
  test("match", () => {
    const root = parseDocker("RUN wget localhost");
    expect(root.match(Q(BashLiteral))).toBe(false);
    expect(root.match(Q(DockerFile))).toBe(true);

    expect(root.match(Q(DockerFile, Q(DockerRun, Q(BashScript))))).toBe(true);
    expect(root.match(Q(DockerFile, DockerRun, BashScript))).toBe(true);
  });

  test("find", () => {
    const root = parseDocker("RUN wget localhost");
    expect(root.find(Q(BashLiteral))).toHaveLength(2);
    let e = root.find(Q(BashWord, Q(BashLiteral, "localhost")));
    expect(e).toHaveLength(1);
    expect(e[0]).toBeInstanceOf(BashWord);
  });

  test("getParent", () => {
    const root = parseDocker("RUN wget localhost");
    expect(root.getElement(BashLiteral)?.getParent(DockerFile)).toBe(root);
    expect(root.children[0].getParent(DockerFile)).toBe(root);
    expect(root.getParent(DockerFile)).toBe(null);
  });

  test("getElement", () => {
    const root = parseDocker("RUN wget localhost");
    expect(root.getElement(BashLiteral)).toBe(root.find(Q(BashLiteral))[0]);
    expect(root.getElement(DockerFile)).toBe(null);
    expect(root.getElement(DockerRun)).toBe(root.children[0]);
  });

  test("getElements", () => {
    const root = parseDocker("RUN wget localhost");
    expect(root.getElements(BashLiteral)).toEqual(root.find(Q(BashLiteral)));
  });

  test("iterate", () => {
    const root = parseDocker("RUN wget localhost");

    const elements: AllDockerNodes[] = [];
    root.iterate((node) => elements.push(node));
    expect(elements).toHaveLength(1);
  });

  test("traverse", () => {
    const root = parseDocker("RUN wget localhost");

    const elements: AllDockerNodes[] = [];
    root.traverse((node) => {
      elements.push(node);
    });
    expect(elements).toHaveLength(10);
  });
  test("clone", () => {
    const root = parseDocker("RUN wget localhost");

    expect(root.clone()).toEqual(root);
  });
});
