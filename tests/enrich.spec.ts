import { parseShell } from "../lib/ast/docker-bash-parser";
import { Matcher } from "../lib/debloat/rule-matcher";

describe("Testing enrich", () => {
  test("grep --", async () => {
    const root = await parseShell(
      "grep -q -- '-Xss256k' \"$CASSANDRA_CONFIG/cassandra-env.sh\""
    );
    const r = Matcher.enrich(root.clone());
    expect(r.children[0].type).toBe("SC-GREP");
  });
  test("apt-get ::", async () => {
    const root = await parseShell(
      "apt-get -o Acquire::GzipIndexes=false update;"
    );
    const r = Matcher.enrich(root.clone());
    expect(r.children[0].type).toBe("SC-APT-GET-UPDATE");
  });
});
