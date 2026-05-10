export type EventMap = {
  'workout.completed':       { workoutId: string; date: string };
  'workout.started':         { workoutId: string; date: string };
  'meal.logged':             { mealId: string; date: string };
  'measurement.recorded':    { measurementId: string; date: string };
  'photo.captured':          { photoId: string; date: string };
  'day.ended':               { date: string };
  'coach.assessment.ready':  { domain: string; date: string };
  'planning.optimized':      { date: string };
  'steps.updated':           { date: string; steps: number };
};
