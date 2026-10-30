// A "singleton" the Node way: module-level state, shared by everyone who
// gets the same cached module instance.
let count = 0;
module.exports = {
  instanceId: Math.random().toString(36).slice(2, 8),
  inc: () => ++count,
};
