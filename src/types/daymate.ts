export type NavSection =
  | 'dashboard'
  | 'tasks'
  | 'timetable'
  | 'attendance'
  | 'study'
  | 'exams'
  | 'progress'
  | 'campus'
  | 'settings';

export type TaskPriority = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type TaskCategory = 'Assignment' | 'Lab' | 'Project' | 'Exam Prep' | 'Personal';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string; // YYYY-MM-DD
  priority: TaskPriority;
  category: TaskCategory;
  status: TaskStatus;
  completed: boolean;
  estimatedMinutes: number;
  notes?: string;
  subtasks: Subtask[];
  createdAt: string;
}

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface TimetableSlot {
  id: string;
  day: WeekDay;
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  subjectCode: string;
  subjectName: string;
  room: string;
  faculty: string;
  classType: 'Lecture' | 'Lab' | 'Tutorial';
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'Holiday' | 'Deadline' | 'Event' | 'Seminar';
  description?: string;
}

export interface SubjectAttendance {
  id: string;
  code: string;
  name: string;
  faculty: string;
  attended: number;
  total: number;
  targetPercent: number;
}

export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  content: string;
  pinned: boolean;
  updatedAt: string;
}

export interface Flashcard {
  id: string;
  subject: string;
  front: string;
  back: string;
  mastered: boolean;
  reviewCount: number;
}

export interface StudySession {
  id: string;
  subject: string;
  minutes: number;
  mode: 'Focus' | 'Short Break' | 'Long Break';
  completedAt: string; // ISO
}

export interface SyllabusTopic {
  id: string;
  title: string;
  completed: boolean;
}

export interface ExamItem {
  id: string;
  subjectCode: string;
  subjectName: string;
  examType: 'Mid-Term' | 'End-Term' | 'Lab Practical' | 'Internal Quiz';
  date: string; // YYYY-MM-DD
  time: string;
  venue: string;
  maxMarks: number;
  internalScored?: number;
  syllabus: SyllabusTopic[];
}

export type GradeLetter = 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'P' | 'F';

export interface GpaCourse {
  id: string;
  code: string;
  name: string;
  credits: number;
  grade: GradeLetter;
}

export interface HabitItem {
  id: string;
  name: string;
  category: 'Study' | 'Health' | 'Coding' | 'Wellness';
  completedDates: string[]; // YYYY-MM-DD[]
}

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: 'Canteen' | 'Books & Print' | 'Transport' | 'Hostel & Rent' | 'Tech & Subscriptions' | 'Other';
  date: string; // YYYY-MM-DD
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  subject: string;
  description: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  course: string;
  semester: string;
  section: string;
  college: string;
  facultyMentor: string;
  academicYear: string;
  monthlyBudget: number;
  previousCredits: number;
  previousCgpa: number;
  passwordHash?: string;
}

export interface DayMateState {
  profile: StudentProfile;
  accounts: StudentProfile[];
  isAuthenticated: boolean;
  theme: 'light' | 'dark';
  scratchpad: string;
  tasks: TaskItem[];
  timetable: TimetableSlot[];
  calendarEvents: CalendarEvent[];
  attendance: SubjectAttendance[];
  notes: StudyNote[];
  flashcards: Flashcard[];
  studySessions: StudySession[];
  exams: ExamItem[];
  gpaCourses: GpaCourse[];
  habits: HabitItem[];
  expenses: ExpenseItem[];
  bookmarks: BookmarkItem[];
}
