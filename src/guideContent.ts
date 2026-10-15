/**
 * Content of the beginner-friendly Markdown guide.
 * Written for people who have never used Markdown or written code.
 */

export interface Lesson {
  id: string;
  title: string;
  /** One-line summary shown in the table of contents. */
  short: string;
  /** Plain-language explanation (may contain simple HTML: <b>, <code>, <kbd>). */
  explain: string;
  /** What the reader types. */
  md: string;
  /** Short syntax shown in the cheat sheet. */
  cheat: string;
  /** Optional friendly tip. */
  tip?: string;
  /** Marks optional, more advanced lessons. */
  extra?: boolean;
}

export const LESSONS: Lesson[] = [
  {
    id: 'headings',
    cheat: '# Title',
    title: 'Titles and headings',
    short: 'Start a line with #',
    explain:
      'Put <code>#</code> and a space at the start of a line to make it a title. ' +
      'More <code>#</code> signs make a smaller heading, like chapters and sub-chapters in a book.',
    md: '# My Trip to Japan\n\n## Day 1: Tokyo\n\n### Where we ate',
    tip: 'Don’t forget the space after <code>#</code>. <code>#Title</code> will not work, <code># Title</code> will.',
  },
  {
    id: 'paragraphs',
    cheat: '(empty line between)',
    title: 'Paragraphs',
    short: 'Leave an empty line',
    explain:
      'Just type normally. To start a <b>new paragraph</b>, leave one empty line between them ' +
      '(press <kbd>Enter</kbd> twice).',
    md: 'This is my first paragraph. It can be as long as I like.\n\nThis is a second paragraph, because I left an empty line above it.',
    tip: 'Pressing <kbd>Enter</kbd> only once keeps the text in the same paragraph. This surprises almost everyone at first!',
  },
  {
    id: 'emphasis',
    cheat: '**bold**  *italic*',
    title: 'Bold and italic',
    short: '**bold** and *italic*',
    explain:
      'Wrap words in <b>two stars</b> to make them bold, and in <b>one star</b> to make them italic. ' +
      'Two tildes <code>~~</code> cross words out.',
    md: 'This is **very important**.\n\nThis is *a little special*.\n\nThis is ***both at once***.\n\nThe meeting is ~~Monday~~ Tuesday.',
  },
  {
    id: 'lists',
    cheat: '- item',
    title: 'Bullet lists',
    short: 'Start lines with -',
    explain:
      'Start each line with a dash <code>-</code> and a space. ' +
      'To put an item <b>inside</b> another, add two spaces in front of it.',
    md: '- Bread\n- Milk\n- Fruit\n  - Apples\n  - Bananas',
    tip: 'You can also use <code>*</code> or <code>+</code> instead of <code>-</code>. They all do the same thing.',
  },
  {
    id: 'numbered',
    cheat: '1. step',
    title: 'Numbered lists',
    short: 'Start lines with 1.',
    explain: 'Type a number, a full stop and a space. Great for steps and instructions.',
    md: '1. Boil the water\n2. Add the pasta\n3. Wait 10 minutes',
    tip: 'Got the numbers wrong? No problem. Markdown counts for you: <code>1. 1. 1.</code> still shows 1, 2, 3.',
  },
  {
    id: 'checklist',
    cheat: '- [ ] to do',
    title: 'Checklists',
    short: '- [ ] and - [x]',
    explain:
      'A to-do list. Use <code>- [ ]</code> for something not done yet, and <code>- [x]</code> for something finished.',
    md: '- [x] Book the hotel\n- [x] Buy train tickets\n- [ ] Pack the suitcase',
  },
  {
    id: 'links',
    cheat: '[text](https://…)',
    title: 'Links',
    short: '[text](address)',
    explain:
      'Put the words people will click in <b>square brackets</b> <code>[ ]</code>, ' +
      'followed right away by the web address in <b>round brackets</b> <code>( )</code>.',
    md: 'Read the [VS Code website](https://code.visualstudio.com) for more.\n\nOr just paste an address: https://example.com',
    tip: 'There must be no space between <code>]</code> and <code>(</code>.',
  },
  {
    id: 'images',
    cheat: '![description](pic.png)',
    title: 'Pictures',
    short: '![description](file)',
    explain:
      'Same as a link, but with an exclamation mark <code>!</code> in front. ' +
      'Inside the brackets, describe the picture in a few words. Then give the picture’s file name.',
    md: '![Mountains at sunset](images/mountain.png)',
    tip: 'Keep your pictures in a folder next to your .md file (for example a folder called <code>images</code>). ' +
      'The description helps people who can’t see the picture.',
  },
  {
    id: 'quotes',
    cheat: '> quote',
    title: 'Quotes and notes',
    short: 'Start a line with >',
    explain: 'Start a line with <code>&gt;</code> to show it as a quote or a side note.',
    md: '> The best way to get started is to quit talking and begin doing.\n>\n> — Walt Disney',
  },
  {
    id: 'tables',
    cheat: '| A | B |',
    title: 'Tables',
    short: 'Use | between columns',
    explain:
      'Separate columns with a straight line <code>|</code>. The second line, made of dashes, ' +
      'tells Markdown that the first line is the header.',
    md: '| Day | City | Hotel |\n|---|---|---|\n| Monday | Tokyo | Sakura Inn |\n| Tuesday | Kyoto | Garden House |',
    tip: 'The columns don’t need to line up neatly in your text. Markdown tidies them for you.',
  },
  {
    id: 'divider',
    cheat: '---',
    title: 'Divider line',
    short: 'Three dashes ---',
    explain: 'Three dashes on their own line draw a line across the page, to separate parts of your document.',
    md: 'Part one ends here.\n\n---\n\nPart two starts here.',
    tip: 'Leave an empty line above the dashes. Otherwise the text above turns into a heading!',
  },
  {
    id: 'code',
    cheat: '`exact text`',
    title: 'Showing exact text',
    short: 'Backticks ` `',
    explain:
      'Sometimes you want text shown <b>exactly as typed</b>, like a password format, a file name or a command. ' +
      'Wrap it in backticks <code>`</code>. For several lines, put three backticks on the lines above and below.',
    md: 'Save the file as `notes.md`.\n\n```\nName:  Lawrence\nEmail: name@example.com\n```',
    tip: 'The backtick key <kbd>`</kbd> is usually at the top-left of the keyboard, under <kbd>Esc</kbd>.',
  },
  {
    id: 'diagrams',
    cheat: '```mermaid',
    title: 'Diagrams',
    short: 'Draw with words',
    explain:
      'You can draw a flowchart just by describing it! Start with <code>```mermaid</code>, ' +
      'then write one arrow per line: <code>A --&gt; B</code> means “A leads to B”. Text in <code>[ ]</code> becomes a box.',
    md: '```mermaid\nflowchart LR\n  A[Wake up] --> B[Coffee]\n  B --> C{Weekend?}\n  C -->|Yes| D[Sleep again]\n  C -->|No| E[Go to work]\n```',
    tip: '<code>LR</code> means left-to-right. Change it to <code>TD</code> for top-down. Text in <code>{ }</code> makes a diamond for questions.',
    extra: true,
  },
  {
    id: 'math',
    cheat: '$x^2$',
    title: 'Math formulas',
    short: 'Between $ signs',
    explain:
      'For students and scientists: put a formula between dollar signs <code>$</code>. ' +
      'Use two dollar signs <code>$$</code> to show it large on its own line.',
    md: 'The area of a circle is $A = \\pi r^2$.\n\n$$\n\\frac{a}{b} + \\sqrt{x}\n$$',
    tip: '<code>^</code> makes a power, <code>\\frac{top}{bottom}</code> makes a fraction, <code>\\sqrt{}</code> a square root.',
    extra: true,
  },
];

export interface Mistake {
  wrong: string;
  right: string;
  why: string;
}

export const MISTAKES: Mistake[] = [
  { wrong: '#Title', right: '# Title', why: 'A space is needed after #.' },
  { wrong: '-Milk', right: '- Milk', why: 'A space is needed after the dash.' },
  { wrong: '** bold **', right: '**bold**', why: 'No spaces just inside the stars.' },
  { wrong: '[link] (https://…)', right: '[link](https://…)', why: 'No space between ] and (.' },
  {
    wrong: 'Line one\nLine two',
    right: 'Line one\n\nLine two',
    why: 'Leave an empty line to start a new paragraph.',
  },
];

export const PRACTICE_FILE = `# My First Markdown Note

Welcome! This is your **practice file**. Change anything you like and
watch the preview on the right update as you type.

## Things to try

- [ ] Make this word **bold**: hello
- [ ] Add a third item to this list
- [ ] Change the title at the top

## A small table

| Fruit | Colour |
|---|---|
| Apple | Red |
| Banana | Yellow |

> Tip: open the **Markdown Guide** from the sidebar any time you forget something.
`;

export const PLAYGROUND_START = `# Hello!

Type here and see the result on the right.

- **Bold** with two stars
- *Italic* with one star
`;
