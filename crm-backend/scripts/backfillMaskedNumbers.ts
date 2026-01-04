// ONE-TIME BACKFILL SCRIPT — DO NOT RUN IN PROD AUTOMATION

import prisma from "../src/prisma/client";
import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function run() {
  const techs = await prisma.user.findMany({
    where: {
      maskedTwilioNumberSid: { not: null },
      maskedTwilioPhoneNumber: null,
    },
    select: {
      id: true,
      maskedTwilioNumberSid: true,
    },
  });

  console.log(`Found ${techs.length} technicians to backfill`);

  for (const tech of techs) {
    try {
      const num = await client
        .incomingPhoneNumbers(tech.maskedTwilioNumberSid!)
        .fetch();

      await prisma.user.update({
        where: { id: tech.id },
        data: {
          maskedTwilioPhoneNumber: num.phoneNumber, // +E164
        },
      });

      console.log(`✔ Updated ${tech.id} → ${num.phoneNumber}`);
    } catch (err) {
      console.error(`❌ Failed for ${tech.id}`, err);
    }
  }

  console.log("Done");
}

run()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));