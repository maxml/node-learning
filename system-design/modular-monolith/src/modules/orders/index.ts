import { findOrder } from './internal/repo';

// публічне API модуля orders
export const getOrderTotal = (id: string) => findOrder(id).total;
