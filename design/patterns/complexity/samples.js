// Same cyclomatic complexity, very different cognitive complexity.
// Measured by `npm run complexity` (ESLint `complexity` + sonarjs `cognitive-complexity`).

// Flat switch: every case is one more path, but it reads as a lookup table.
export function statusText(code) {
  switch (code) {
    case 200: return "OK";
    case 201: return "Created";
    case 204: return "No Content";
    case 400: return "Bad Request";
    case 404: return "Not Found";
    default: return "Unknown";
  }
}

// Nested conditions: the same number of paths, but the reader must hold the nesting stack.
export function shippingFee(order) {
  // Cognitive increments (SonarSource): structure +1, plus +1 per level of nesting.
  if (order.items.length > 0) {                     // +1
    if (order.country === "UA") {                   // +2 (nesting 1)
      if (order.total > 100) {                      // +3 (nesting 2)
        return 0;
      } else if (order.express) {                   // +1 (else if: no nesting penalty)
        return 15;
      }
    } else {                                        // +1
      for (const item of order.items) {            // +3 (nesting 2)
        if (item.hazardous) {                       // +4 (nesting 3)  => total 15
          return 50;
        }
      }
    }
  }
  return 10;
}

// Guard clauses: same behaviour as shippingFee, flattened.
export function shippingFeeFlat(order) {
  if (order.items.length === 0) return 10;
  if (order.country !== "UA") return order.items.some((i) => i.hazardous) ? 50 : 10;
  if (order.total > 100) return 0;
  return order.express ? 15 : 10;
}
