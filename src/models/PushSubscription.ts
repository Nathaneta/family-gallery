import { Schema, model, models } from "mongoose";

export interface IWebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IPushSubscriptionDoc {
  userId: Schema.Types.ObjectId;
  subscription: IWebPushSubscription;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscriptionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    subscription: {
      endpoint: { type: String, required: true },
      keys: {
        p256dh: { type: String, required: true },
        auth: { type: String, required: true },
      },
    },
    userAgent: { type: String, default: "" },
  },
  { timestamps: true }
);

PushSubscriptionSchema.index({ "subscription.endpoint": 1 }, { unique: true });

export const PushSubscription =
  models.PushSubscription ?? model<IPushSubscriptionDoc>("PushSubscription", PushSubscriptionSchema);
