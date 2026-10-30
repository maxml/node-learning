// Антипатерн «зайві індекси»: чого не видно в $indexStats і що робить hideIndex.
// Запуск: mongosh --quiet /work/index_stats.js (див. README.md; ~75 с через TTL-монітор)
const d = db.getSiblingDB("ux");
d.dropDatabase();
d.c.createIndex({ email: 1 }, { unique: true });
d.c.createIndex({ exp: 1 }, { expireAfterSeconds: 0 });
d.c.createIndex({ day: 1, time: 1 });
d.c.createIndex({ time: 1 });
for (let i = 0; i < 1000; i++) d.c.insertOne({ email: "u" + i, exp: new Date(Date.now() - 1000), day: i % 7, time: i });

try { d.c.insertOne({ email: "u1" }); print("1. unique: дублікат прийнято"); }
catch (e) { print(`1. unique: дублікат відхилено, code=${e.code}`); }

for (let i = 0; i < 5; i++) d.c.find({ time: 500 }).toArray();
const ops = () => Object.fromEntries(d.c.aggregate([{ $indexStats: {} }]).toArray().map(x => [x.name, Number(x.accesses.ops)]));
print(`2. ops після 5 запитів за time: ${JSON.stringify(ops())}`);

d.c.hideIndex("time_1");
print(`3. ops після hideIndex(time_1): time_1=${ops().time_1}`);
const e = d.c.find({ time: 500 }).explain("executionStats");
print(`4. find({time}) при прихованому time_1: ${e.queryPlanner.winningPlan.stage}, docsExamined=${e.executionStats.totalDocsExamined}`);
const e2 = d.c.find({ time: 500 }).hint("day_1_time_1").explain("executionStats");
print(`5. той самий запит з hint на {day, time}: keysExamined=${e2.executionStats.totalKeysExamined} з ${d.c.countDocuments()}`);

d.c.hideIndex("email_1");
try { d.c.insertOne({ email: "u2" }); print("6. прихований unique: дублікат прийнято"); }
catch (err) { print(`6. прихований unique: дублікат відхилено, code=${err.code}`); }
d.c.unhideIndex("email_1");

sleep(70000);   // TTL-монітор прокидається раз на 60 с
print(`7. документів після TTL: ${d.c.countDocuments()}; ops: ${JSON.stringify(ops())}`);
