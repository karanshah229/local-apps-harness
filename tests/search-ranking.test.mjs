import test from 'node:test';
import assert from 'node:assert/strict';
import { getSearchMatchScore, getMultiFieldSearchScore, fuzzyMatch } from '../packages/todo-shared/dist/index.js';

test('Search Match Scoring & Ranking: Exact match first, then fuzzy match', () => {
  // 1. Exact full match (4.0) vs startsWith (3.5) vs word boundary (3.0) vs substring (2.0) vs fuzzy (1.0) vs none (0.0)
  const exactScore = getSearchMatchScore('Milk', 'Milk');
  const prefixScore = getSearchMatchScore('Milkshake', 'Milk');
  const wordPrefixScore = getSearchMatchScore('Fresh Milk Bottle', 'Milk');
  const substringScore = getSearchMatchScore('Soymilk carton', 'Milk');
  const fuzzyScore = getSearchMatchScore('Meeting in leadership Kyiv', 'Milk');
  const noneScore = getSearchMatchScore('Vegetables', 'Milk');

  assert.equal(exactScore, 4.0);
  assert.equal(prefixScore, 3.5);
  assert.equal(wordPrefixScore, 3.0);
  assert.equal(substringScore, 2.0);
  assert.equal(fuzzyScore, 1.0);
  assert.equal(noneScore, 0.0);

  // Verify hierarchy
  assert.ok(exactScore > prefixScore);
  assert.ok(prefixScore > wordPrefixScore);
  assert.ok(wordPrefixScore > substringScore);
  assert.ok(substringScore > fuzzyScore);
  assert.ok(fuzzyScore > noneScore);

  // 2. Sorting items with search query
  const tasks = [
    { id: 1, title: 'Meeting in leadership Kyiv' }, // fuzzy matches 'milk'
    { id: 2, title: 'Buy Fresh Milk' },             // word prefix matches 'milk'
    { id: 3, title: 'Milk' },                       // exact full matches 'milk'
    { id: 4, title: 'Soymilk' },                    // substring matches 'milk'
    { id: 5, title: 'Milkshake order' },            // prefix matches 'milk'
  ];

  const query = 'Milk';
  const matchingTasks = tasks
    .filter(t => fuzzyMatch(t.title, query))
    .sort((a, b) => {
      const scoreA = getSearchMatchScore(a.title, query);
      const scoreB = getSearchMatchScore(b.title, query);
      return scoreB - scoreA;
    });

  const sortedTitles = matchingTasks.map(t => t.title);
  assert.deepEqual(sortedTitles, [
    'Milk',
    'Milkshake order',
    'Buy Fresh Milk',
    'Soymilk',
    'Meeting in leadership Kyiv',
  ]);

  // 3. Multi-field search (e.g. contact name, phone, email)
  const contacts = [
    { name: 'Karan Shah', phone: '+919876543210' },
    { name: 'Ramesh Patel (Work)', phone: '+919876522222' },
    { name: 'Ramesh Patel (Mobile)', phone: '+919876511111' },
    { name: 'Dr. Ramesh', phone: '+919111111111' },
  ];

  const contactQuery = 'Ramesh';
  const sortedContacts = contacts
    .filter(c => getMultiFieldSearchScore([c.name, c.phone], contactQuery) > 0)
    .sort((a, b) => {
      const scoreA = getMultiFieldSearchScore([a.name, a.phone], contactQuery);
      const scoreB = getMultiFieldSearchScore([b.name, b.phone], contactQuery);
      return scoreB - scoreA;
    });

  assert.equal(sortedContacts[0].name.startsWith('Ramesh'), true);
});
