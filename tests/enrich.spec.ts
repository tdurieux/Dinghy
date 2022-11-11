import { parseShell } from "../lib/ast/docker-bash-parser";
import {
  BashCommandArgs,
  BashCommandCommand,
  MaybeSemanticCommand,
  Q,
} from "../lib/ast/docker-type";
import { Matcher } from "../lib/debloat/rule-matcher";

describe("Testing enrich", () => {
  test("mv source dest", async () => {
    const root = await parseShell("mv source dest");
    const r = Matcher.enrich(root);
    expect(r.find(Q("SC-MV-DESTINATION"))).toHaveLength(1);
  });
  test("grep --", async () => {
    const root = await parseShell(
      "grep -q -- '-Xss256k' \"$CASSANDRA_CONFIG/cassandra-env.sh\""
    );
    const r = Matcher.enrich(root);
    expect(r.getElement(MaybeSemanticCommand)?.annotations).toEqual([
      "SC-GREP",
    ]);
    expect(r.getElements(BashCommandArgs)[3]?.annotations).toEqual([
      "SC-GREP-PATH",
    ]);
  });
  test("apt-get ::", async () => {
    const root = await parseShell(
      "apt-get -o Acquire::GzipIndexes=false update;"
    );
    const r = Matcher.enrich(root);
    expect(r.getElement(MaybeSemanticCommand)?.annotations).toEqual([
      "SC-APT-GET-UPDATE",
    ]);
  });

  test("acd", async () => {
    const root = await parseShell("cd ~;");
    const r = Matcher.enrich(root);
    expect(r.getElement(MaybeSemanticCommand)?.annotations).toEqual(["SC-CD"]);
    expect(r.getElement(BashCommandArgs)?.annotations).toEqual(["SC-CD-PATH"]);
  });
});
