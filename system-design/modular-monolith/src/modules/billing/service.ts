import { getOrderTotal } from '../orders/index';          // дозволено: публічне API
import { findOrder } from '../orders/internal/repo';     // порушення: внутрішність чужого модуля

export const bill = (id: string) => getOrderTotal(id) + findOrder(id).total;
