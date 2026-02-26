export type Habit = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  completed_date: string;
  created_at: string;
};

export type HabitWithLogs = Habit & {
  logs: HabitLog[];
};
