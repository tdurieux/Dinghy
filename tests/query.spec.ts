import { parseDocker } from "../lib";
import { Q, QAND, QOR, QValue } from "../lib/docker-type";

describe("Query", () => {
  test("QOR", () => {
    const root = parseDocker("FROM image\nRUN wget localhost\nADD a b");
    expect(root.find(Q(QOR("DOCKER-FROM", "DOCKER-ADD")))).toHaveLength(2);
  });
  test("QAND", () => {
    const root = parseDocker("FROM image\nRUN wget localhost\nADD a b");
    expect(
      root.find(Q(QAND("DOCKER-IMAGE-NAME", QValue("image"))))
    ).toHaveLength(1);
  });
});
