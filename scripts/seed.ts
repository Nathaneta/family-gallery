/**
 * Seeds the Getachew family accounts + default shared folder.
 * Natan Getachew is the gallery admin. Run: `npm run seed`
 */
import { config } from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { hashPassword } from "../src/lib/auth";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const members = [
  {
    name: "Getachew Agonafir",
    email: "getachew@family.gallery",
    key: "getachew",
    displayRole: "Father",
    sortIndex: 0,
    isAdmin: false,
  },
  {
    name: "Aster Haile",
    email: "aster@family.gallery",
    key: "aster",
    displayRole: "Mother",
    sortIndex: 1,
    isAdmin: false,
  },
  {
    name: "Firehiwot Getachew",
    email: "firehiwot@family.gallery",
    key: "firehiwot",
    displayRole: "Sister",
    sortIndex: 2,
    isAdmin: false,
  },
  {
    name: "Bisrat Getachew",
    email: "bisrat@family.gallery",
    key: "bisrat",
    displayRole: "Brother",
    sortIndex: 3,
    isAdmin: false,
  },
  {
    name: "Medal Getachew",
    email: "medal@family.gallery",
    key: "medal",
    displayRole: "Sister",
    sortIndex: 4,
    isAdmin: false,
  },
  {
    name: "Edom Getachew",
    email: "edom@family.gallery",
    key: "edom",
    displayRole: "Sister",
    sortIndex: 5,
    isAdmin: false,
  },
  {
    name: "Natan Getachew",
    email: "natan@family.gallery",
    key: "natan",
    displayRole: "Brother",
    sortIndex: 6,
    isAdmin: true,
  },
] as const;

function avatarFor(_name: string, seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/256/256`;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("Set MONGODB_URI in .env.local");
    process.exit(1);
  }
  await mongoose.connect(mongoUri);
  const { User } = await import("../src/models/User");
  const { Album } = await import("../src/models/Album");

  const demoPassword = process.env.SEED_PASSWORD ?? "family-gallery-demo";
  const passwordHash = await hashPassword(demoPassword);

  for (const m of members) {
    await User.findOneAndUpdate(
      { email: m.email },
      {
        $set: {
          name: m.name,
          email: m.email,
          passwordHash,
          avatarUrl: avatarFor(m.name, m.key),
          displayRole: m.displayRole,
          sortIndex: m.sortIndex,
          isAdmin: m.isAdmin,
        },
      },
      { upsert: true, returnDocument: "after" }
    );
    console.log("Seeded:", m.email, m.isAdmin ? "(admin)" : "");
  }

  const natan = await User.findOne({ email: "natan@family.gallery" });
  if (natan) {
    const existingFamilyAlbums = await Album.countDocuments({ scope: "family" });
    if (existingFamilyAlbums === 0) {
      await Album.create({
        name: "Family — main album",
        description: "Default shared folder (add more in Admin)",
        scope: "family",
        ownerUserId: null,
        createdBy: natan._id,
      });
      console.log("Created default family album.");
    }
  }

  console.log("\nDone. Demo password for all accounts:", demoPassword);
  console.log("Admin login: natan@family.gallery");
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
