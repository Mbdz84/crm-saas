import { Request, Response } from "express";
import Twilio from "twilio";

/**
 * Pull Twilio numbers that are allowed for masked calls
 */
export async function getMaskedTwilioNumbers(
  req: Request,
  res: Response
) {
  try {
    const client = Twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    // Your voice webhook base (important)
    const VOICE_WEBHOOK_CONTAINS = "/twilio/voice";

    const numbers = await client.incomingPhoneNumbers.list({
      limit: 50,
    });

    const maskedNumbers = numbers
      .filter((n) =>
        n.voiceUrl && n.voiceUrl.includes(VOICE_WEBHOOK_CONTAINS)
      )
      .map((n) => ({
        sid: n.sid,
        phoneNumber: n.phoneNumber,
        friendlyName: n.friendlyName,
      }));

    res.json(maskedNumbers);
  } catch (err) {
    console.error("❌ Failed to load masked Twilio numbers", err);
    res.status(500).json({ error: "Failed to load Twilio numbers" });
  }
}