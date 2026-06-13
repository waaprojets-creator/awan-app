export type EventMap = {
  'workout.completed':       { workoutId: string; date: string };
  'workout.started':         { workoutId: string; date: string };
  'meal.logged':             { mealId: string; date: string };
  'measurement.recorded':    { measurementId: string; date: string };
  'photo.captured':          { photoId: string; date: string };
  'day.ended':               { date: string };
  'coach.assessment.ready':  { domain: string; date: string };
  'planning.optimized':      { date: string };
  'task.modified':           { taskId: string };
  'steps.updated':           { date: string; steps: number };
  'sport.routine.modified':     { routineId: string };
  'habit.definition.modified':  { habitId: string };
  'sleep.alarm.modified':       { date: string };
  // Écritures domaine sans store dédié — émises au niveau service pour tenir
  // le visionneur Planning à jour (getByDate + event bus).
  'journal.logged':             { date: string };
  'prayer.logged':              { date: string };
  'quran.logged':               { date: string };
  'habit.logged':               { date: string };
  // États de vie (segments intra-journée) modifiés pour une date.
  'state.changed':              { date: string };
};
