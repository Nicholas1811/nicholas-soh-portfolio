export const identity = {
  name: "Nicholas Soh",
  fullName: "Soh De Lin Nicholas",
  descriptors: [
    "builds backends",
    "breaks frontends",
    "ships things",
    "debugs at 2am",
    "automates the boring",
  ],
  blurb: [
    "I'm a Year 2 Software Engineering student at Singapore Management University, currently interning as a software engineer at Tan Tock Seng Hospital — building tools that give nurses and specialists their hours back.",
    "Before SMU, I spent six months at PayPal teaching GANs to forge training data (legally) and squeezing 10% more accuracy out of OCR models. I like systems that talk to each other: microservices, message queues, and the occasional push notification at exactly the wrong time.",
    "When I'm not shipping, I'm mentoring — I've coached teens through national exams and taught 16-year-olds to build their first Next.js apps.",
  ],
  location: "Singapore",
};

export const contact = {
  emailSchool: "nicholassoh.2024@computing.smu.edu.sg",
  emailPersonal: "nicholassdl660@gmail.com",
  github: "https://github.com/Nicholas1811",
  githubHandle: "Nicholas1811",
  linkedin: "https://www.linkedin.com/in/nicholassohdelin/",
};

export type ExperienceItem = {
  org: string;
  role: string;
  period: string;
  kind: "work" | "education" | "community";
  points: string[];
};

export const experience: ExperienceItem[] = [
  {
    org: "Tan Tock Seng Hospital",
    role: "Software Engineer Intern",
    period: "May 2026 — Present",
    kind: "work",
    points: [
      "Delivering AI-based visual acuity tools for National Healthcare Group patients — halving the manpower needed to run the tests.",
      "Laid the foundation of a web app for nurses to analyse electroretinogram reports, saving ~15 hours of processing time.",
    ],
  },
  {
    org: "PayPal",
    role: "Machine Learning Engineer Intern",
    period: "Jul 2021 — Jan 2022",
    kind: "work",
    points: [
      "Built GANs to generate synthetic images, automatically expanding OCR training datasets by 200–400 labelled samples daily.",
      "Benchmarked and optimised OCR models — +10% accuracy with synthetic data.",
      "Implemented zero-shot field extraction with CLIP for automated document processing.",
    ],
  },
  {
    org: "Singapore Management University",
    role: "BSc Software Engineering · GPA 3.91/4.0",
    period: "Aug 2024 — Aug 2028",
    kind: "education",
    points: [
      "Second major in Technology for Business Solutions (Product Development).",
    ],
  },
  {
    org: "Project Heartcode",
    role: "Mentor",
    period: "Sep 2024 — Jan 2025",
    kind: "community",
    points: [
      "Mentored two 16-year-olds through building a drug-education website with Next.js and shadcn.",
    ],
  },
  {
    org: "SHINE Children & Youth Services",
    role: "Academic Coach",
    period: "Jun 2024 — Oct 2024",
    kind: "community",
    points: [
      "Coached youths through national exams — they hit their target grades.",
    ],
  },
  {
    org: "Temasek Polytechnic",
    role: "Dip. Financial Business Informatics (Merit) · GPA 3.93/4.0",
    period: "Apr 2019 — Apr 2022",
    kind: "education",
    points: [],
  },
];

export type Project = {
  title: string;
  role: string;
  period: string;
  description: string;
  stack: string[];
  link: string;
  rotation: number;
};

export const projects: Project[] = [
  {
    title: "Just Meal Savers",
    role: "Full Stack Developer",
    period: "Jan — Apr 2026",
    description:
      "A platform for buying leftover food before it hits the bin. Built the composite microservices with Temporal workflows and Firebase push notifications.",
    stack: ["Microservices", "Temporal", "Firebase", "TypeScript"],
    link: "https://github.com/Nicholas1811/is213-backend",
    rotation: -2,
  },
  {
    title: "BrainRot Learning Platform",
    role: "Backend Developer",
    period: "Jan — Apr 2026",
    description:
      "An online platform that teaches Gen Alpha slang and culture. Owned the core concept/lesson service, security hardening, and testing under agile + XP practices.",
    stack: ["Spring Boot", "Security", "TDD", "Agile/XP"],
    link: "https://github.com/Joseph-LohYeKai/CS203-Project",
    rotation: 1.5,
  },
  {
    title: "Attendance Marking Platform",
    role: "Full Stack Developer",
    period: "Aug — Nov 2025",
    description:
      "Automated classroom attendance using facial recognition — OpenCV models plus face-embedding generation so professors never call roll again.",
    stack: ["OpenCV", "Facial Recognition", "Java"],
    link: "https://github.com/Darren322/cs102-opencv",
    rotation: -1,
  },
  {
    title: "OnlyNotes",
    role: "Full Stack Developer",
    period: "Aug — Nov 2025",
    description:
      "A peer-to-peer note-sharing repository bridging the knowledge gap between student cohorts, with AI-driven mind maps for visualising complex concepts.",
    stack: ["AI Mind Mapping", "Full Stack", "TypeScript"],
    link: "https://github.com/Nicholas1811/onlynotes-readme/tree/main",
    rotation: 2,
  },
  {
    title: "SMUEats",
    role: "Full Stack Developer",
    period: "May — Aug 2025",
    description:
      "A summer side project: food ordering for SMU's lunch rush, built to serve potentially 1,000 students and staff.",
    stack: ["Next.js", "Full Stack", "TypeScript"],
    link: "https://github.com/Nicholas1811/SMUEats",
    rotation: -1.5,
  },
  {
    title: "TPOH2021",
    role: "Frontend Developer",
    period: "Sep 2020 — Jan 2021",
    description:
      "A mobile app for Temasek Polytechnic's Open House with a Google Maps API-based game — 925 downloads on the App Store and Google Play.",
    stack: ["Ionic", "Google Maps API", "Mobile"],
    link: "https://invented-passbook-85e.notion.site/TPOH-2021-207cd4017dc1805f8decf0a24a88d52f",
    rotation: 1,
  },
];

export const skills: string[] = [
  "Java",
  "Spring Boot",
  "Python",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "FastAPI",
  "PHP",
  "MySQL",
  "PostgreSQL",
  "AWS",
  "Supabase",
  "Docker",
  "RabbitMQ",
  "Firebase",
  "Tailwind",
  "Ionic",
  "TensorFlow",
  "LangChain",
  "Linux",
  "Temporal",
];

export const certifications = [
  {
    title: "AWS Certified Cloud Practitioner",
    detail: "EC2 · RDS · S3 · IAM · cloud pricing",
  },
  {
    title: "AWS Foundations of Prompt Engineering",
    detail: "prompt fundamentals · task decomposition · LLM evaluation",
  },
];

export const heroStickers = [
  { label: "Spring Boot", hue: "accent" },
  { label: "Next.js", hue: "ink" },
  { label: "AWS", hue: "sage" },
  { label: "Docker", hue: "ink" },
  { label: "FastAPI", hue: "accent" },
  { label: "RabbitMQ", hue: "sage" },
] as const;
