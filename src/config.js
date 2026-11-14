// Edit this file to change lists, weights and status bands.
export const DEPTS = ['IT', 'CS', 'SE'];
export const SEMS = ['Semester I', 'Semester II'];
export const TYPES = ['Mid-term', 'Final'];
export const YEARS = [2, 3, 4, 5];
export const LEC_WEIGHT = 0.7; // lab weight = 1 - LEC_WEIGHT (used only when the course has a lab)

// [from, status name, colour]. A rate belongs to the last band whose "from" it reaches.
export const MID = [
  [0,   'Bad – Immediate Action Needed',                '#fecaca'],
  [0.2, 'Very Slow – Close Follow-up Needed',           '#fed7aa'],
  [0.3, 'Slightly Slow',                                '#fde68a'],
  [0.4, 'Needs Improvement',                            '#fef3c7'],
  [0.5, 'Good – Recommended',                           '#bbf7d0'],
  [0.6, 'Average',                                      '#bfdbfe'],
  [0.7, 'Must Be Investigated – Review Teaching Method','#e9d5ff'],
];
// Final-report bands (proposal: full coverage is expected at the end of the semester).
export const FINAL = [
  [0, MID[0][1]], [0.4, MID[1][1]], [0.6, MID[2][1]],
  [0.75, MID[3][1]], [0.85, MID[5][1]], [0.95, MID[4][1]],
];
export const STATUSES = MID.map((b) => b[1]);
export const colorOf = (s) => (MID.find((b) => b[1] === s) || [])[2] || '#eef0f3';

// Sign-off officials (names are filled in the app's "Officials" tab; positions can be edited there too).
export const DEFAULT_OFFICIALS = {
  dean: { name: '', position: 'Dean, School of Computing' },
  heads: {
    IT: { name: '', position: 'Head, Department of Information Technology' },
    CS: { name: '', position: 'Head, Department of Computer Science' },
    SE: { name: '', position: 'Head, Department of Software Engineering' },
  },
};
