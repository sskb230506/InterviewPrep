import { callLLM } from '../llm/orchestrator.js';

// Company tier to difficulty mapping
const COMPANY_DIFFICULTY_MAP = {
    // Tier 1 — FAANG (Hard)
    google: 'Hard', meta: 'Hard', facebook: 'Hard', amazon: 'Hard',
    apple: 'Hard', microsoft: 'Hard',
    // Tier 2 — Product companies (Medium-Hard)
    adobe: 'Medium-Hard', uber: 'Medium-Hard', linkedin: 'Medium-Hard',
    flipkart: 'Medium-Hard', swiggy: 'Medium-Hard', atlassian: 'Medium-Hard',
    // Tier 3 — Mid-tier (Medium)
    infosys: 'Medium', hcl: 'Medium', capgemini: 'Medium',
    zoho: 'Medium', mphasis: 'Medium', mindtree: 'Medium',
    // Tier 4 — Service companies (Easy)
    tcs: 'Easy', cognizant: 'Easy', accenture: 'Easy',
    wipro: 'Easy', techm: 'Easy', 'tech mahindra': 'Easy',
    hexaware: 'Easy', ltimindtree: 'Easy',
};

const DIFFICULTY_CONSTRAINTS = {
    'Easy': `
- Use simple arrays, strings, or basic math.
- Only O(n) or O(n²) solutions expected.
- Typical patterns: linear scan, two pointers (simple), frequency count.
- No dynamic programming, graphs, or complex data structures.
- Example difficulty: Two Sum, Reverse String, Palindrome Check.`,
    'Medium': `
- May involve sorting, hashmaps, stacks, queues, or simple trees.
- O(n log n) or O(n) solutions expected.
- Typical patterns: sliding window, two pointers, binary search, BFS/DFS on simple graphs.
- Example difficulty: Group Anagrams, Binary Search, Level Order Traversal.`,
    'Medium-Hard': `
- Can involve graphs, dynamic programming (1D/2D), heaps, or complex trees.
- Multiple approaches expected with trade-offs.
- Typical patterns: Dijkstra, Knapsack, Merge Sort, Trie operations.
- Example difficulty: Word Break, Course Schedule, LRU Cache.`,
    'Hard': `
- Involve complex DP, advanced graph algorithms, segment trees, or creative problem solving.
- Optimal time and space complexity required.
- Typical patterns: Monotonic stack, advanced DP, union-find, topological sort.
- Example difficulty: Trapping Rain Water, Median of Data Streams, Edit Distance.`,
};

const STARTER_CODE = {
    python: (funcName) => `def ${funcName}(nums):\n    # Write your solution here\n    pass\n\n# Example usage:\n# print(${funcName}([1, 2, 3]))`,
    javascript: (funcName) => `/**\n * @param {number[]} nums\n * @return {number}\n */\nvar ${funcName} = function(nums) {\n    // Write your solution here\n    \n};\n\n// Example:\n// console.log(${funcName}([1, 2, 3]));`,
    java: (funcName) => `class Solution {\n    public int ${funcName}(int[] nums) {\n        // Write your solution here\n        return 0;\n    }\n}`,
    cpp: (funcName) => `class Solution {\npublic:\n    int ${funcName}(vector<int>& nums) {\n        // Write your solution here\n        return 0;\n    }\n};`,
};

/**
 * Generate a DSA problem based on company difficulty and topic.
 */
export async function generateDSAProblem({ company, language, topic, previousProblems = [] }) {
    const companyKey = company.toLowerCase().trim();
    const difficulty = COMPANY_DIFFICULTY_MAP[companyKey] || 'Medium';
    const difficultyHints = DIFFICULTY_CONSTRAINTS[difficulty];

    const systemPrompt = `You are an expert Data Structures & Algorithms problem setter for technical interviews.
Generate ONE original coding problem for a ${company} interview (difficulty: ${difficulty}).

DIFFICULTY REQUIREMENTS for ${difficulty}:
${difficultyHints}

The problem MUST:
- Be solvable in ${language}
- Be original (not a direct copy of a well-known LeetCode problem title, but similar style)
- Avoid topics: ${previousProblems.length > 0 ? previousProblems.map(p => p.topic).join(', ') : 'None'}
- Focus on topic area: ${topic || 'General Algorithms'}

Return EXACTLY valid JSON with this EXACT structure:
{
  "title": "Problem Title",
  "difficulty": "${difficulty}",
  "topic": "${topic || 'General'}",
  "description": "Full multi-line problem description explaining what needs to be done",
  "examples": [
    { "input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]" },
    { "input": "nums = [3,2,4], target = 6", "output": "[1,2]", "explanation": "nums[1] + nums[2] == 6" }
  ],
  "constraints": ["2 <= nums.length <= 10^4", "-10^9 <= nums[i] <= 10^9", "Only one valid answer exists"],
  "hints": ["Think about what complement each number needs", "A hashmap can give O(1) lookups"],
  "functionName": "twoSum",
  "starterCode": "def twoSum(nums, target):\\n    # Write your solution\\n    pass",
  "testCases": [
    { "input": "[2,7,11,15], 9", "expected": "[0,1]" },
    { "input": "[3,2,4], 6", "expected": "[1,2]" }
  ],
  "timeComplexityExpected": "O(n)",
  "spaceComplexityExpected": "O(n)"
}`;

    const userPrompt = `Generate a ${difficulty} level DSA problem for ${company} interview.
Topic: ${topic || 'Arrays / Strings / Basic Algorithms based on difficulty'}.
Language context: ${language}.
Previously generated problem topics to avoid: ${previousProblems.length > 0 ? previousProblems.map(p => p.title).join(', ') : 'None'}.`;

    const model = process.env.LLM_MODEL_REASONING || 'llama-3.3-70b-versatile';

    const response = await callLLM({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        maxRetries: 3
    });

    return { ...response, company, difficulty, language };
}

/**
 * Evaluate submitted code against the problem.
 */
export async function evaluateDSACode({ problem, code, language }) {
    const systemPrompt = `You are an expert code reviewer and algorithm specialist.
Evaluate the submitted ${language} code for the given DSA problem.

Be strict but fair. Check:
1. Correctness — does it solve all test cases?
2. Edge cases — does it handle empty arrays, single elements, negatives, etc.?
3. Time complexity — is it optimal or acceptable?
4. Space complexity — is memory usage reasonable?
5. Code quality — clean, readable, no unnecessary loops?

Return EXACTLY valid JSON:
{
  "passed": true or false,
  "passedCount": number of test cases that would pass,
  "totalCount": total test cases,
  "testResults": [
    { "input": "test input", "expected": "expected output", "actual": "what code produces", "passed": true/false, "notes": "why failed if applicable" }
  ],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(n)",
  "overallFeedback": "Detailed multi-line feedback on the solution",
  "improvements": ["Suggestion 1", "Suggestion 2"],
  "score": 8
}`;

    const userPrompt = `Problem: ${problem.title}
Description: ${problem.description}
Test Cases: ${JSON.stringify(problem.testCases)}

Submitted ${language} Code:
\`\`\`${language}
${code}
\`\`\``;

    const model = process.env.LLM_MODEL_REASONING || 'llama-3.3-70b-versatile';

    return await callLLM({
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        maxRetries: 3
    });
}
