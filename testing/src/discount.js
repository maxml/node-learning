'use strict';
// Members get 10% off orders of 100 or more.
function discount(total, isMember) {
  if (isMember && total >= 100) return total * 0.9;
  return total;
}
module.exports = { discount };
