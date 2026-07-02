import pdfParse from './pdfWrapper.cjs';
import mammoth from 'mammoth';
import { chatCompletionJSON } from './llmClient.js';
import { env } from '../config/env.js';

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

export async function extractSkillsFromResume(buffer, mimeType, fileName, role = '') {
  let text = '';
  const normalizedMimeType = String(mimeType || '').toLowerCase();

  try {
    if (normalizedMimeType.includes('pdf')) {
      const data = await pdfParse(buffer);
      text = data.text || '';
    } else if (
      normalizedMimeType.includes('word') ||
      normalizedMimeType.includes('officedocument') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.doc')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    }
  } catch (err) {
    console.error('Error extracting text from resume file:', err);
  }

  // Clean the text slightly
  text = (text || '').trim();

  // If text extraction failed or text is too short, fallback to name-based extraction
  if (text.length < 50) {
    console.log('Resume text too short or extraction failed, falling back to name-based extraction');
    return extractSkillsFromResumeName(fileName, role);
  }

  // Extract skills using LLM
  try {
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) assistant. 
Your task is to analyze the provided resume text and extract all relevant professional skills.
Extract both technical skills (programming languages, frameworks, tools, databases, cloud providers, etc.) and core soft skills (communication, leadership, etc.).
Provide the list as a JSON array of strings under the key "skills". Return ONLY the JSON object. Do not include explanations, code blocks, or markdown formatting.

Example response:
{
  "skills": ["JavaScript", "React", "Node.js", "SQL", "Git", "Problem Solving", "System Design"]
}`;

    const userPrompt = `Resume text:
${text.slice(0, 8000)}`;

    const result = await chatCompletionJSON(env.llmModelExtraction, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ], {
      temperature: 0.1,
      max_tokens: 1000
    });

    if (Array.isArray(result?.skills)) {
      const parsedSkills = result.skills
        .map(s => String(s).trim())
        .filter(s => s.length > 0 && s.length < 50);

      if (parsedSkills.length > 0) {
        return parsedSkills.slice(0, 15); // Return up to 15 key skills
      }
    }
  } catch (err) {
    console.error('LLM skills extraction failed, falling back to name-based:', err);
  }

  return extractSkillsFromResumeName(fileName, role);
}
