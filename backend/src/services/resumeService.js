const COMMON_SKILLS = [
  'Communication',
  'Problem Solving',
  'JavaScript',
  'API Design',
  'Debugging',
  'System Design',
  'Testing',
];

const ROLE_SKILLS = {
  Frontend: ['React', 'CSS', 'Performance Optimization', 'Accessibility'],
  Backend: ['Node.js', 'Databases', 'Caching', 'Authentication'],
  Full: ['React', 'Node.js', 'Databases', 'CI/CD'],
  Data: ['SQL', 'Python', 'Data Modeling', 'ETL'],
};

export function extractSkillsFromResumeName(fileName, role = '') {
  const lower = fileName.toLowerCase();
  const skills = new Set(COMMON_SKILLS);

  for (const token of Object.keys(ROLE_SKILLS)) {
    if (role.toLowerCase().includes(token.toLowerCase()) || lower.includes(token.toLowerCase())) {
      for (const skill of ROLE_SKILLS[token]) {
        skills.add(skill);
      }
    }
  }

  if (lower.includes('react')) skills.add('React');
  if (lower.includes('node')) skills.add('Node.js');
  if (lower.includes('typescript')) skills.add('TypeScript');
  if (lower.includes('python')) skills.add('Python');

  return Array.from(skills).slice(0, 10);
}
