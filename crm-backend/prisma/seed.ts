import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ---------------------------------------------------
  // 1. Create COMPANY
  // ---------------------------------------------------
  const company = await prisma.company.create({
    data: {
      name: "Test Company",
      phone: "1234567890",
      address: "123 Main St",
      logoUrl: null,
      smsSettings: {
        // DEFAULT SMS SETTINGS FORMAT (NEW SYSTEM)
        show: {
          id: true,
          name: true,
          phone: true,
          address: true,
          jobType: true,
          notes: true,
          appointment: true,
          leadSource: true,
        },
        labels: {
          id: "Job ID",
          name: "Name",
          phone: "Phone",
          address: "Address",
          jobType: "Job",
          notes: "Notes",
          appointment: "APP",
          leadSource: "Source",
        },
        order: [
          "id",
          "name",
          "phone",
          "address",
          "jobType",
          "notes",
          "appointment",
          "leadSource",
        ],
      },
    },
  });

  console.log("✔ Company created:", company.id);

  // ---------------------------------------------------
  // 2. Create ADMIN USER
  // ---------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      email: "admin@test.com",
      password: "$2a$10$hashedpasswordhere", // <-- replace with real hash later
      name: "Admin User",
      phone: "1234567890",
      role: "admin",
      companyId: company.id,
      active: true,
    },
  });

  console.log("✔ Admin user created:", admin.email);

  // ---------------------------------------------------
  // 3. Insert DEFAULT JOB STATUSES
  // ---------------------------------------------------
  const statusNames = [
    { name: "Accepted", color: "#3b82f6" },
    { name: "In Progress", color: "#10b981" },
    { name: "Appointment", color: "#22c55e" },
    { name: "On Hold", color: "#eab308" },
    { name: "Billing", color: "#a855f7" },
    { name: "Closed", color: "#9ca3af", locked: true },
    { name: "Pending Close", color: "#0ea5e9" },
    { name: "Canceled", color: "#ef4444" },
    { name: "Pending Cancel", color: "#f97316" },
    { name: "Estimate", color: "#8b5cf6" },
    { name: "Follow Up", color: "#64748b" },
  ];

  for (let i = 0; i < statusNames.length; i++) {
    await prisma.jobStatus.create({
      data: {
        name: statusNames[i].name,
        order: i,
        active: true,
        color: statusNames[i].color,
        locked: statusNames[i].locked ?? false,
      },
    });
  }

  console.log("✔ Default job statuses created");

  // ---------------------------------------------------
  // 4. OPTIONAL — DEFAULT JOB TYPES
  // ---------------------------------------------------
  await prisma.jobType.createMany({
    data: [
      { name: "Lockout", companyId: company.id },
      { name: "Car Key", companyId: company.id },
      { name: "Rekey", companyId: company.id },
    ],
  });

  console.log("✔ Job types created");

  // ---------------------------------------------------
  // 5. OPTIONAL — DEFAULT LEAD SOURCES
  // ---------------------------------------------------
  await prisma.leadSource.createMany({
    data: [
      { name: "Google Ads", companyId: company.id },
      { name: "Google Maps", companyId: company.id },
      { name: "Website", companyId: company.id },
      { name: "Referral", companyId: company.id },
    ],
  });

  console.log("✔ Lead sources created");

  console.log("🎉 DONE!");
}

main()
  .catch((e) => {
    console.error("❌ SEED ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });