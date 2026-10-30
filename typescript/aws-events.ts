// Типи AWS Lambda (@types/aws-lambda 8.10.164), SDK v3 (@aws-sdk/client-sqs 3.1160.0) і
// версіонований контракт події. `node aws-events.ts` викликає хендлери з підробленими подіями
// локально: без AWS, без мережі.
import type {
  EventBridgeEvent, EventBridgeHandler, SQSEvent, SQSBatchResponse, SQSRecord,
  APIGatewayProxyHandlerV2, APIGatewayProxyEventV2, Context,
} from "aws-lambda";
import { SQSClient, SendMessageCommand, type SendMessageCommandOutput } from "@aws-sdk/client-sqs";
import { z } from "zod";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;

// ---------- 1. Контракт події з версіями ----------
// v1: сума в центах числом. v2: сума з валютою. Продюсери оновлюються незалежно від споживачів.
const OrderPaidV1 = z.object({ version: z.literal(1), orderId: z.string(), amountCents: z.number().int() });
const OrderPaidV2 = z.object({
  version: z.literal(2), orderId: z.string(),
  amount: z.object({ cents: z.number().int(), currency: z.string().length(3) }),
});
const OrderPaid = z.discriminatedUnion("version", [OrderPaidV1, OrderPaidV2]);
type OrderPaidV2 = z.infer<typeof OrderPaidV2>;

// Внутрішній тип споживача один; апкаст старих версій в одному місці.
type Payment = { orderId: string; cents: number; currency: string };
function toPayment(e: z.infer<typeof OrderPaid>): Payment {
  switch (e.version) {
    case 1: return { orderId: e.orderId, cents: e.amountCents, currency: "EUR" };
    case 2: return { orderId: e.orderId, cents: e.amount.cents, currency: e.amount.currency };
    default: { const never: never = e; throw new Error(`unknown version ${JSON.stringify(never)}`); }
  }
}

// ---------- 2. EventBridge: generic detail це заява, а не перевірка ----------
export const trustingHandler: EventBridgeHandler<"OrderPaid", OrderPaidV2, string> = async (event) =>
  `${event.detail.orderId}: ${event.detail.amount.cents} ${event.detail.amount.currency}`;

export const validatingHandler = async (event: EventBridgeEvent<"OrderPaid", unknown>) => {
  const parsed = OrderPaid.safeParse(event.detail);
  if (!parsed.success) throw new Error(`invalid OrderPaid: ${parsed.error.issues[0]?.message}`); // → retry/DLQ
  const p = toPayment(parsed.data);
  return `${p.orderId}: ${p.cents} ${p.currency}`;
};

// ---------- 3. SQS: часткова відповідь пакета ----------
export const sqsHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const batchItemFailures: SQSBatchResponse["batchItemFailures"] = [];
  for (const r of event.Records) {
    try {
      toPayment(OrderPaid.parse(JSON.parse(r.body)));
    } catch {
      batchItemFailures.push({ itemIdentifier: r.messageId });
    }
  }
  return { batchItemFailures };
};

// ---------- 4. API Gateway HTTP API (payload v2) ----------
export const httpHandler: APIGatewayProxyHandlerV2 = async (event) => {
  type _body = Expect<Equal<APIGatewayProxyEventV2["body"], string | undefined>>;
  const body: unknown = JSON.parse(event.body ?? "null");
  const r = OrderPaid.safeParse(body);
  return r.success ? { statusCode: 202 } : { statusCode: 400, body: JSON.stringify(r.error.issues) };
};

// ---------- 5. SDK v3: типи команд ----------
export async function sdkTypes(client: SQSClient) {
  // @ts-expect-error TS2769: No overload matches this call (немає MessageBody)
  new SendMessageCommand({ QueueUrl: "q" });
  // А `undefined` у «обов'язковому» полі компілюється: тип поля `string | undefined`.
  const cmd = new SendMessageCommand({ QueueUrl: process.env.QUEUE_URL, MessageBody: "x" });
  const out = await client.send(cmd);
  type _out = Expect<Equal<typeof out, SendMessageCommandOutput>>;
  type _id = Expect<Equal<typeof out.MessageId, string | undefined>>;
  return out.MessageId;
}

// ---------- прогін ----------
if (import.meta.main) {
  const ctx = {} as Context;
  const eb = (detail: unknown): EventBridgeEvent<"OrderPaid", any> => ({
    id: "1", version: "0", account: "1", time: "", region: "eu-central-1", resources: [],
    source: "shop", "detail-type": "OrderPaid", detail,
  });
  const v1 = { version: 1, orderId: "o-1", amountCents: 1250 };
  const v2 = { version: 2, orderId: "o-2", amount: { cents: 990, currency: "USD" } };
  const v2plus = { ...v2, couponCode: "AUTUMN" }; // адитивна зміна продюсера

  for (const [name, d] of [["v1 (старий продюсер)", v1], ["v2", v2]] as const) {
    try { console.log("trusting  ", name.padEnd(22), await trustingHandler(eb(d), ctx, () => {})); }
    catch (e) { console.log("trusting  ", name.padEnd(22), "THROW", (e as Error).message); }
  }
  for (const [name, d] of [["v1", v1], ["v2", v2], ["v2 + couponCode", v2plus], ["v3 (невідома)", { version: 3, orderId: "o-3" }]] as const) {
    try { console.log("validating", name.padEnd(22), await validatingHandler(eb(d))); }
    catch (e) { console.log("validating", name.padEnd(22), "THROW", (e as Error).message); }
  }
  const strictV2 = z.strictObject(OrderPaidV2.shape);
  console.log("strict consumer, v2 + couponCode:", strictV2.safeParse(v2plus).success ? "OK" : "REJECT " + strictV2.safeParse(v2plus).error?.issues[0]?.message);

  const rec = (id: string, body: string) => ({ messageId: id, body }) as SQSRecord;
  console.log("sqs", JSON.stringify(await sqsHandler({ Records: [rec("m1", JSON.stringify(v1)), rec("m2", "{oops"), rec("m3", JSON.stringify(v2))] })));
}
