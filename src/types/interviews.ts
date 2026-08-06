export type QuestionType = "theoretical" | "practical" | "scenario" | "mcq";

export type MCQOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type Difficulty = "easy" | "medium" | "hard";

export type QuestionItem = {
  id: string;
  interviewId?: string;
  applicationId?: string;
  company?: string;
  jobTitle?: string;
  roundType?: string;
  question: string;
  type: QuestionType;
  language: string;
  subLanguage: string;
  answer?: string;
  codeSnippet?: string;
  options?: MCQOption[];
  correctOptionId?: string;
  difficulty?: Difficulty;
  dateAdded: string;
  notes?: string;
  tags?: string[];
};

export type InterviewOutcome = "pending" | "passed" | "failed" | "completed";

export type InterviewRecord = {
  id: string;
  applicationId?: string;
  company: string;
  jobTitle?: string;
  roundType: string;
  interviewDate: string;
  interviewerName?: string;
  locationOrUrl?: string;
  outcome?: InterviewOutcome;
  notes?: string;
  questions: QuestionItem[];
  createdAt: string;
  updatedAt: string;
};

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  theoretical: "Theoretical",
  practical: "Practical / Coding",
  scenario: "Scenario Based",
  mcq: "MCQ Based",
};

export const QUESTION_TYPE_CLASSES: Record<QuestionType, string> = {
  theoretical: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200/60 dark:border-blue-500/20",
  practical: "bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200/60 dark:border-purple-500/20",
  scenario: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
  mcq: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
};

/** Standard presets for Languages & Frameworks (Frontend, Backend, Styling, Databases, Languages) */
export const PRESET_LANGUAGES = [
  "React",
  "Angular",
  "Node.js",
  "Tailwind CSS",
  "Bootstrap",
  "JavaScript",
  "TypeScript",
  "Python",
  "HTML",
  "CSS",
  "SQL",
  "Java",
  "C++",
  "Vue.js",
  "Svelte",
  "Next.js",
  "Express.js",
  "NestJS",
  "Django",
  "Spring Boot",
  "Sass / SCSS",
  "Styled Components",
  "Material UI",
  "Shadcn UI",
  "MongoDB",
  "PostgreSQL",
  "Docker",
  "System Design",
];

/** Standard presets for Sub Languages / Categories / Topics */
export const PRESET_SUB_LANGUAGES = [
  "Arrays",
  "Strings",
  "Objects",
  "Linked Lists",
  "Stacks & Queues",
  "Trees & Graphs",
  "Hash Maps",
  "Recursion",
  "Dynamic Programming",
  "Hooks",
  "Directives",
  "Services",
  "Middleware",
  "State Management",
  "Flexbox & Grid",
  "Responsive Design",
  "Async & Promises",
  "Event Loop",
  "DOM Manipulation",
  "REST APIs",
  "GraphQL",
  "Authentication & JWT",
  "Routing",
  "Performance Optimization",
  "Custom Components",
  "Security & CORS",
];
