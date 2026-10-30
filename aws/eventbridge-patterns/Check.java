import software.amazon.event.ruler.Machine;

import java.util.List;

/**
 * Edge cases of EventBridge event patterns, run against aws/event-ruler,
 * the open-source library that EventBridge event-bus matching runs on
 * (AWS What's New, 2024-02-01: "now runs on Open Source Event Ruler v1.5.0").
 *
 * Each case: a pattern, an event, and the result we expect from the
 * EventBridge docs. The program prints the actual result and flags any
 * mismatch, so a surprising outcome is visible instead of silently passing.
 */
public class Check {

    static int failures = 0;

    static final String BASE = "\"version\":\"0\",\"id\":\"1\",\"source\":\"shop\","
            + "\"detail-type\":\"OrderPlaced\",\"account\":\"111111111111\","
            + "\"time\":\"2026-10-30T00:00:00Z\",\"region\":\"eu-central-1\",\"resources\":[]";

    static String ev(String detail) {
        return "{" + BASE + ",\"detail\":" + detail + "}";
    }

    /** expected: "match", "no match" or "invalid" (pattern rejected). */
    static void check(String name, String pattern, String event, String expected) {
        String actual;
        try {
            Machine m = new Machine();
            m.addRule("r", pattern);
            List<String> hits = m.rulesForJSONEvent(event);
            actual = hits.isEmpty() ? "no match" : "match";
        } catch (Exception e) {
            actual = "invalid";
        }
        boolean ok = actual.equals(expected);
        if (!ok) failures++;
        System.out.printf("%-4s %-58s expected=%-9s actual=%s%n", ok ? "ok" : "FAIL", name, expected, actual);
    }

    public static void main(String[] args) {
        // 1. Pattern values must be arrays; an array means OR.
        check("01 value must be an array",
                "{\"source\":\"shop\"}", ev("{}"), "invalid");
        check("02 array in pattern = OR",
                "{\"source\":[\"billing\",\"shop\"]}", ev("{}"), "match");

        // 2. Matching is case-sensitive unless equals-ignore-case.
        check("03 exact match is case-sensitive",
                "{\"source\":[\"Shop\"]}", ev("{}"), "no match");
        check("04 equals-ignore-case",
                "{\"source\":[{\"equals-ignore-case\":\"SHOP\"}]}", ev("{}"), "match");

        // 3. Fields absent from the pattern are ignored.
        check("05 extra event fields are ignored",
                "{\"detail\":{\"status\":[\"paid\"]}}",
                ev("{\"status\":\"paid\",\"amount\":10,\"x\":{\"y\":1}}"), "match");

        // 4. Numeric matching works only on JSON numbers.
        check("06 numeric >100 vs number 150",
                "{\"detail\":{\"amount\":[{\"numeric\":[\">\",100]}]}}",
                ev("{\"amount\":150}"), "match");
        check("07 numeric >100 vs string \"150\"",
                "{\"detail\":{\"amount\":[{\"numeric\":[\">\",100]}]}}",
                ev("{\"amount\":\"150\"}"), "no match");
        check("08 exact [\"150\"] vs number 150",
                "{\"detail\":{\"amount\":[\"150\"]}}",
                ev("{\"amount\":150}"), "no match");
        check("09 exact [5] vs number 5.0",
                "{\"detail\":{\"amount\":[5]}}",
                ev("{\"amount\":5.0}"), "match");

        // 5. null vs missing vs exists.
        check("10 [null] vs explicit null",
                "{\"detail\":{\"x\":[null]}}", ev("{\"x\":null}"), "match");
        check("11 [null] vs missing field",
                "{\"detail\":{\"x\":[null]}}", ev("{}"), "no match");
        check("12 exists:false vs missing field",
                "{\"detail\":{\"x\":[{\"exists\":false}]}}", ev("{}"), "match");
        check("13 exists:false vs explicit null",
                "{\"detail\":{\"x\":[{\"exists\":false}]}}", ev("{\"x\":null}"), "no match");
        check("14 exists:true vs explicit null",
                "{\"detail\":{\"x\":[{\"exists\":true}]}}", ev("{\"x\":null}"), "match");
        check("15 [\"\"] vs empty string",
                "{\"detail\":{\"x\":[\"\"]}}", ev("{\"x\":\"\"}"), "match");

        // 6. Arrays in the event: match if ANY element matches.
        check("16 [\"a\"] vs tags [\"b\",\"a\"]",
                "{\"detail\":{\"tags\":[\"a\"]}}", ev("{\"tags\":[\"b\",\"a\"]}"), "match");
        check("17 anything-but [\"a\"] vs tags [\"a\",\"b\"]",
                "{\"detail\":{\"tags\":[{\"anything-but\":[\"a\"]}]}}",
                ev("{\"tags\":[\"a\",\"b\"]}"), "match");
        check("18 anything-but vs missing field",
                "{\"detail\":{\"status\":[{\"anything-but\":[\"cancelled\"]}]}}",
                ev("{}"), "no match");

        // 7. Two conditions on an array of objects must hold in the SAME element.
        String items = "{\"items\":[{\"sku\":\"A\",\"qty\":1},{\"sku\":\"B\",\"qty\":5}]}";
        check("19 sku=A and qty>3 in different elements",
                "{\"detail\":{\"items\":{\"sku\":[\"A\"],\"qty\":[{\"numeric\":[\">\",3]}]}}}",
                ev(items), "no match");
        check("20 sku=B and qty>3 in the same element",
                "{\"detail\":{\"items\":{\"sku\":[\"B\"],\"qty\":[{\"numeric\":[\">\",3]}]}}}",
                ev(items), "match");

        // 8. prefix / suffix / wildcard / anything-but+prefix / cidr / $or.
        check("21 prefix",
                "{\"detail\":{\"key\":[{\"prefix\":\"img/\"}]}}", ev("{\"key\":\"img/a.png\"}"), "match");
        check("22 suffix is case-sensitive",
                "{\"detail\":{\"key\":[{\"suffix\":\".png\"}]}}", ev("{\"key\":\"img/A.PNG\"}"), "no match");
        check("23 suffix + equals-ignore-case",
                "{\"detail\":{\"key\":[{\"suffix\":{\"equals-ignore-case\":\".png\"}}]}}",
                ev("{\"key\":\"img/A.PNG\"}"), "match");
        check("24 wildcard",
                "{\"detail\":{\"key\":[{\"wildcard\":\"img/*.png\"}]}}", ev("{\"key\":\"img/x/a.png\"}"), "match");
        check("25 anything-but prefix",
                "{\"detail\":{\"key\":[{\"anything-but\":{\"prefix\":\"tmp/\"}}]}}",
                ev("{\"key\":\"tmp/a\"}"), "no match");
        check("26 cidr",
                "{\"detail\":{\"ip\":[{\"cidr\":\"10.0.0.0/24\"}]}}", ev("{\"ip\":\"10.0.0.7\"}"), "match");
        check("27 $or across fields",
                "{\"detail\":{\"$or\":[{\"a\":[1]},{\"b\":[2]}]}}", ev("{\"b\":2}"), "match");
        check("28 boolean true vs string \"true\"",
                "{\"detail\":{\"f\":[true]}}", ev("{\"f\":\"true\"}"), "no match");

        System.out.println(failures == 0 ? "ALL AS EXPECTED" : failures + " UNEXPECTED");
    }
}
