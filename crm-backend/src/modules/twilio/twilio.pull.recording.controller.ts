import { Request, Response } from "express";
import axios from "axios";

export async function streamRecording(req: Request, res: Response) {
  try {
    const { sid } = req.params;

    if (!sid) {
      return res.status(400).send("Missing recording SID");
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Recordings/${sid}.mp3`;

    const twilioRes = await axios.get(url, {
      responseType: "stream",
      auth: {
        username: process.env.TWILIO_ACCOUNT_SID!,
        password: process.env.TWILIO_AUTH_TOKEN!,
      },
    });

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${sid}.mp3"`
    );

    twilioRes.data.pipe(res);
  } catch (err) {
    console.error("❌ STREAM RECORDING ERROR", err);
    res.status(500).send("Failed to stream recording");
  }
}