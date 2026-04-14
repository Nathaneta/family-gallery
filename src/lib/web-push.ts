import webpush from "web-push";
import { PushSubscription } from "@/models/PushSubscription";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

let configured = false;

function ensurePushConfigured() {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function hasWebPushEnv() {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
}

export async function sendPushToAll(payload: PushPayload, opts?: { excludeUserId?: string }) {
  if (!ensurePushConfigured()) return;

  const filter = opts?.excludeUserId ? { userId: { $ne: opts.excludeUserId } } : {};
  const subs = await PushSubscription.find(filter).lean();
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
  });

  await Promise.all(
    subs.map(async (doc) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: doc.subscription.endpoint,
            keys: doc.subscription.keys,
          },
          data
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ _id: doc._id });
        }
      }
    })
  );
}

export async function sendPushToUsers(payload: PushPayload, userIds: string[]) {
  if (!ensurePushConfigured()) return;
  if (userIds.length === 0) return;
  const subs = await PushSubscription.find({ userId: { $in: userIds } }).lean();
  if (subs.length === 0) return;

  const data = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard",
  });

  await Promise.all(
    subs.map(async (doc) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: doc.subscription.endpoint,
            keys: doc.subscription.keys,
          },
          data
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ _id: doc._id });
        }
      }
    })
  );
}
