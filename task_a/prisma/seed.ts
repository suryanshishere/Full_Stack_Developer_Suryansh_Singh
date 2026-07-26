import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";
import { computeScore } from "../src/lib/leads";

type MemberKey = "admin" | "rohan" | "mia";

type SeedLead = {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message?: string;
  source: string;
  priority: string;
  value?: number;
  path: string[];
  assignKey?: MemberKey;
  createdDays: number;
  followUpInDays?: number;
  lostReason?: string;
  notes?: { byKey: MemberKey; body: string; days: number }[];
};

const SEED_LEADS: SeedLead[] = [
  {
    name: "Priya Nair",
    email: "priya@zenkart.in",
    phone: "+91 98200 11223",
    company: "Zenkart",
    message: "We need a partner to rebuild our storefront and improve conversion. Looking to start within a month.",
    source: "WEB_FORM",
    priority: "HIGH",
    value: 250000,
    path: ["CONTACTED", "QUALIFIED", "PROPOSAL"],
    assignKey: "rohan",
    createdDays: 12,
    followUpInDays: -1,
    notes: [
      { byKey: "rohan", body: "Discovery call done. They want checkout redesign first, then the PDP. Budget confirmed.", days: 8 },
      { byKey: "rohan", body: "Sent proposal v2 with phased scope. She will review with the founder this week.", days: 2 },
    ],
  },
  {
    name: "Arjun Malhotra",
    email: "arjun@brighthr.io",
    phone: "+91 98110 44556",
    company: "BrightHR",
    message: "Referred by Kunal. We want a client portal for our HR consulting practice.",
    source: "REFERRAL",
    priority: "HIGH",
    value: 480000,
    path: ["CONTACTED", "QUALIFIED", "PROPOSAL", "WON"],
    assignKey: "mia",
    createdDays: 28,
    notes: [{ byKey: "mia", body: "Contract signed today. Kickoff scheduled for Monday. Handing to delivery.", days: 3 }],
  },
  {
    name: "Sneha Kulkarni",
    email: "sneha@finlytics.co",
    company: "Finlytics",
    message: "Interested in a dashboard for our SME lending data. Can you share relevant case studies?",
    source: "WEB_FORM",
    priority: "MEDIUM",
    value: 120000,
    path: ["CONTACTED", "QUALIFIED"],
    assignKey: "rohan",
    createdDays: 9,
    followUpInDays: 2,
    notes: [{ byKey: "rohan", body: "Shared two fintech case studies. She is looping in their CTO for a technical call.", days: 4 }],
  },
  {
    name: "Vikram Singh",
    email: "vikram@craftmytrip.com",
    phone: "+91 99870 77665",
    company: "CraftMyTrip",
    message: "Saw your work on Instagram. Need a booking site refresh before the season.",
    source: "SOCIAL",
    priority: "LOW",
    value: 60000,
    path: ["CONTACTED", "LOST"],
    assignKey: "mia",
    createdDays: 21,
    lostReason: "Chose a cheaper freelancer for a quick fix",
  },
  {
    name: "Ananya Iyer",
    email: "ananya@urbannest.design",
    company: "UrbanNest Interiors",
    message: "We want a portfolio site with a lead form for consultation bookings.",
    source: "WEB_FORM",
    priority: "MEDIUM",
    value: 90000,
    path: ["CONTACTED"],
    assignKey: "rohan",
    createdDays: 5,
    followUpInDays: 1,
  },
  {
    name: "Kabir Anand",
    email: "kabir@pixelforge.studio",
    phone: "+91 98765 33445",
    company: "PixelForge Studio",
    message: "Met at the Bengaluru design meetup, wants to discuss a white-label partnership.",
    source: "MANUAL",
    priority: "MEDIUM",
    value: 150000,
    path: [],
    createdDays: 2,
  },
  {
    name: "Riya Kapoor",
    email: "riya@meditrack.health",
    company: "MediTrack",
    message: "We need HIPAA-style compliance guidance plus a patient intake flow. Timeline is tight.",
    source: "WEB_FORM",
    priority: "HIGH",
    value: 350000,
    path: ["CONTACTED", "QUALIFIED"],
    assignKey: "mia",
    createdDays: 7,
    followUpInDays: -2,
    notes: [{ byKey: "mia", body: "Compliance questions answered on call. Waiting on their data-flow diagram before we scope.", days: 3 }],
  },
  {
    name: "Farhan Sheikh",
    email: "farhan@greengrocer.in",
    company: "GreenGrocer",
    message: "Do you build delivery apps? What does a basic version cost?",
    source: "WEB_FORM",
    priority: "LOW",
    path: [],
    createdDays: 1,
  },
  {
    name: "Tanvi Desai",
    email: "tanvi@skillsprint.academy",
    phone: "+91 90040 88990",
    company: "SkillSprint Academy",
    message: "Kunal recommended you. We need an LMS with payments for our cohort courses.",
    source: "REFERRAL",
    priority: "MEDIUM",
    value: 200000,
    path: ["CONTACTED", "QUALIFIED", "PROPOSAL"],
    assignKey: "mia",
    createdDays: 15,
    followUpInDays: 3,
    notes: [{ byKey: "mia", body: "Proposal sent. She asked about EMI options for the payment gateway.", days: 5 }],
  },
  {
    name: "Aditya Rao",
    email: "aditya@bytebridge.dev",
    phone: "+91 98450 22110",
    company: "ByteBridge Solutions",
    message: "Enterprise intranet rebuild, 200+ users, SSO required.",
    source: "MANUAL",
    priority: "HIGH",
    value: 800000,
    path: ["CONTACTED", "QUALIFIED", "PROPOSAL", "WON"],
    assignKey: "rohan",
    createdDays: 35,
    notes: [
      { byKey: "rohan", body: "Signed the SOW. Phase 1 is auth migration and the employee directory.", days: 10 },
      { byKey: "admin", body: "Flagging as a reference client for future enterprise pitches.", days: 9 },
    ],
  },
  {
    name: "Meera Pillai",
    email: "meera@lumendental.clinic",
    company: "Lumen Dental",
    message: "Looking for a simple appointment booking page for two clinics.",
    source: "WEB_FORM",
    priority: "LOW",
    value: 45000,
    path: ["CONTACTED", "LOST"],
    assignKey: "rohan",
    createdDays: 18,
    lostReason: "Budget frozen until next quarter",
  },
  {
    name: "Dhruv Joshi",
    email: "dhruv@rapidlogix.com",
    company: "RapidLogix",
    message: "Found you on LinkedIn. We need a shipment tracking dashboard for clients.",
    source: "SOCIAL",
    priority: "MEDIUM",
    value: 110000,
    path: ["CONTACTED"],
    assignKey: "mia",
    createdDays: 3,
    followUpInDays: 5,
  },
  {
    name: "Ishita Bose",
    email: "ishita@chaipoint.cafe",
    company: "ChaiPoint Cafes",
    message: "We want online ordering for our five outlets in Pune.",
    source: "WEB_FORM",
    priority: "MEDIUM",
    value: 75000,
    path: [],
    createdDays: 1,
  },
  {
    name: "Nikhil Menon",
    email: "nikhil.menon@novafit.in",
    company: "NovaFit",
    message: "Old contact from a previous gym-software inquiry, re-engaging.",
    source: "OTHER",
    priority: "LOW",
    path: [],
    assignKey: "rohan",
    createdDays: 6,
  },
  {
    name: "Sara Fernandes",
    email: "sara@papertrail.legal",
    phone: "+91 98220 66778",
    company: "PaperTrail Legal",
    message: "Referred by BrightHR. We need a secure document intake portal for clients.",
    source: "REFERRAL",
    priority: "HIGH",
    value: 300000,
    path: ["CONTACTED", "QUALIFIED"],
    assignKey: "admin",
    createdDays: 10,
    followUpInDays: 1,
    notes: [{ byKey: "admin", body: "Handling this one myself given the compliance angle. NDA signed.", days: 6 }],
  },
  {
    name: "Yash Agarwal",
    email: "yash@hostellershub.com",
    company: "Hostellers Hub",
    message: "We run 12 hostels and need a central booking site with UPI payments.",
    source: "WEB_FORM",
    priority: "MEDIUM",
    value: 95000,
    path: ["CONTACTED"],
    assignKey: "mia",
    createdDays: 4,
  },
];

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

async function main() {
  await db.activity.deleteMany();
  await db.note.deleteMany();
  await db.lead.deleteMany();
  await db.user.deleteMany();

  const adminHash = await hashPassword("Admin@1234");
  const memberHash = await hashPassword("Member@1234");

  const admin = await db.user.create({
    data: { name: "Ava Sharma", email: "admin@leadline.demo", passwordHash: adminHash, role: "ADMIN" },
  });
  const rohan = await db.user.create({
    data: { name: "Rohan Mehta", email: "member@leadline.demo", passwordHash: memberHash, role: "MEMBER" },
  });
  const mia = await db.user.create({
    data: { name: "Mia D'Souza", email: "mia@leadline.demo", passwordHash: memberHash, role: "MEMBER" },
  });
  await db.user.create({
    data: {
      name: "Dev Kapoor",
      email: "former@leadline.demo",
      passwordHash: memberHash,
      role: "MEMBER",
      isActive: false,
    },
  });

  const users: Record<MemberKey, { id: string; name: string }> = { admin, rohan, mia };

  for (const seed of SEED_LEADS) {
    const createdAt = daysAgo(seed.createdDays);
    const assignee = seed.assignKey ? users[seed.assignKey] : null;

    const events: { type: string; actorId: string | null; meta: Record<string, unknown> }[] = [
      {
        type: "LEAD_CREATED",
        actorId: seed.source === "WEB_FORM" ? null : admin.id,
        meta: { source: seed.source },
      },
    ];
    if (assignee) {
      events.push({
        type: "ASSIGNED",
        actorId: admin.id,
        meta: { fromUserId: null, toUserId: assignee.id, toUserName: assignee.name },
      });
    }
    let previousStatus = "NEW";
    for (const status of seed.path) {
      events.push({
        type: "STATUS_CHANGED",
        actorId: assignee?.id ?? admin.id,
        meta: {
          from: previousStatus,
          to: status,
          ...(status === "LOST" && seed.lostReason ? { lostReason: seed.lostReason } : {}),
        },
      });
      previousStatus = status;
    }

    const gap = seed.createdDays / (events.length + 1);
    const eventTimes = events.map((_, index) => daysAgo(seed.createdDays - gap * index));
    const noteTimes = (seed.notes ?? []).map((note) => daysAgo(note.days));
    const lastActivityAt = [eventTimes[eventTimes.length - 1], ...noteTimes].reduce((a, b) =>
      a > b ? a : b
    );

    const lead = await db.lead.create({
      data: {
        name: seed.name,
        email: seed.email,
        phone: seed.phone ?? null,
        company: seed.company ?? null,
        message: seed.message ?? null,
        source: seed.source,
        status: seed.path[seed.path.length - 1] ?? "NEW",
        priority: seed.priority,
        value: seed.value ?? null,
        score: computeScore({
          value: seed.value ?? null,
          priority: seed.priority,
          source: seed.source,
          createdAt,
        }),
        nextFollowUpAt: seed.followUpInDays !== undefined ? daysAgo(-seed.followUpInDays) : null,
        lostReason: seed.lostReason ?? null,
        assignedToId: assignee?.id ?? null,
        createdAt,
        lastActivityAt,
      },
    });

    for (const [index, event] of events.entries()) {
      await db.activity.create({
        data: {
          leadId: lead.id,
          actorId: event.actorId,
          type: event.type,
          meta: JSON.stringify(event.meta),
          createdAt: eventTimes[index],
        },
      });
    }
    for (const [index, note] of (seed.notes ?? []).entries()) {
      const author = users[note.byKey];
      await db.note.create({
        data: { leadId: lead.id, authorId: author.id, body: note.body, createdAt: noteTimes[index] },
      });
      await db.activity.create({
        data: {
          leadId: lead.id,
          actorId: author.id,
          type: "NOTE_ADDED",
          meta: JSON.stringify({ preview: note.body.slice(0, 80) }),
          createdAt: noteTimes[index],
        },
      });
    }
  }

  const counts = {
    users: await db.user.count(),
    leads: await db.lead.count(),
    notes: await db.note.count(),
    activities: await db.activity.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Admin login: admin@leadline.demo / Admin@1234");
  console.log("Member login: member@leadline.demo / Member@1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
