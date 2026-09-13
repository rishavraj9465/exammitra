export const samplePages = [
  {
    number: 1,
    text: "Introduction to Biology: Cell Foundations\nCells are the basic structural and functional units of life. Cell theory states that all living organisms consist of one or more cells, that the cell is the basic unit of life, and that all cells arise from existing cells. Prokaryotic cells do not have a membrane-bound nucleus. Eukaryotic cells have a membrane-bound nucleus that houses DNA. The plasma membrane is a selectively permeable boundary made primarily of a phospholipid bilayer. It controls the movement of substances into and out of the cell. The cytoplasm includes the fluid and cellular structures between the plasma membrane and nucleus.",
  },
  {
    number: 2,
    text: "Cell Organelles and Their Roles\nThe nucleus stores genetic information in DNA and helps regulate cell activities. Ribosomes synthesize proteins by translating messenger RNA. Mitochondria carry out much of cellular respiration, producing ATP that supplies usable energy for cell processes. The rough endoplasmic reticulum is studded with ribosomes and helps process proteins. The Golgi apparatus modifies, sorts, and packages proteins for transport. Lysosomes contain enzymes that break down waste materials. In plant cells, chloroplasts carry out photosynthesis, and a cellulose cell wall provides structural support.",
  },
  {
    number: 3,
    text: "Movement Across Membranes\nDiffusion is the net movement of particles from a region of higher concentration to lower concentration. Osmosis is the movement of water across a selectively permeable membrane toward a region of higher solute concentration. Passive transport does not require direct cellular energy input and moves substances down their concentration gradient. Active transport requires energy, often ATP, to move substances against their concentration gradient. In a hypotonic solution, water tends to enter an animal cell; in a hypertonic solution, water tends to leave it. In an isotonic solution, there is no net movement of water.",
  },
];
const quiz = [
  [
    "Which statement belongs to cell theory?",
    [
      "All cells have a nucleus",
      "All cells arise from existing cells",
      "Only animals contain cells",
      "Cells cannot reproduce",
    ],
    1,
    "Cell theory states that all cells arise from existing cells.",
    "Cell foundations",
    1,
  ],
  [
    "Which organelle synthesizes proteins?",
    ["Lysosome", "Golgi apparatus", "Ribosome", "Chloroplast"],
    2,
    "Ribosomes translate messenger RNA to synthesize proteins.",
    "Organelles",
    2,
  ],
  [
    "What is the main role of mitochondria?",
    [
      "Store all genetic information",
      "Provide a cellulose wall",
      "Package proteins",
      "Produce ATP through cellular respiration",
    ],
    3,
    "Mitochondria carry out much of cellular respiration, producing usable energy as ATP.",
    "Organelles",
    2,
  ],
  [
    "Which process uses energy to move substances against a concentration gradient?",
    ["Active transport", "Diffusion", "Osmosis", "Passive transport"],
    0,
    "Active transport needs energy to move substances against their concentration gradient.",
    "Membrane transport",
    3,
  ],
  [
    "What tends to happen to an animal cell in a hypertonic solution?",
    [
      "Water enters the cell",
      "There is no water movement",
      "Water leaves the cell",
      "The cell gains a cell wall",
    ],
    2,
    "Water tends to leave a cell in a hypertonic solution, where the surrounding solute concentration is higher.",
    "Membrane transport",
    3,
  ],
];
const cards = [
  [
    "What is a cell?",
    "The basic structural and functional unit of life.",
    "Cell foundations",
    1,
  ],
  [
    "What distinguishes eukaryotes from prokaryotes?",
    "Eukaryotic cells have a membrane-bound nucleus; prokaryotic cells do not.",
    "Cell foundations",
    1,
  ],
  [
    "What is the plasma membrane?",
    "A selectively permeable phospholipid bilayer that controls movement into and out of the cell.",
    "Cell foundations",
    1,
  ],
  [
    "What does the nucleus do?",
    "Stores DNA and helps regulate cell activities.",
    "Organelles",
    2,
  ],
  [
    "What do ribosomes do?",
    "Synthesize proteins by translating messenger RNA.",
    "Organelles",
    2,
  ],
  [
    "Why do cells need mitochondria?",
    "They produce ATP through cellular respiration.",
    "Organelles",
    2,
  ],
  [
    "What does the Golgi apparatus do?",
    "Modifies, sorts and packages proteins for transport.",
    "Organelles",
    2,
  ],
  [
    "Define diffusion.",
    "Net particle movement from higher to lower concentration.",
    "Membrane transport",
    3,
  ],
  [
    "Define osmosis.",
    "Movement of water across a selectively permeable membrane toward higher solute concentration.",
    "Membrane transport",
    3,
  ],
  [
    "How does active transport differ from passive transport?",
    "Active transport requires energy and can move substances against a gradient; passive transport moves down the gradient without direct energy input.",
    "Membrane transport",
    3,
  ],
];
export const samplePack = {
  _id: "sample",
  title: "Introduction to Biology",
  subject: "Biology",
  detail: "concise",
  status: "ready",
  pageCount: 3,
  sample: true,
  content: {
    overview:
      "A short guide to the building blocks of life: how cells are organised, what their organelles do, and how materials move across their boundaries.",
    topics: [
      {
        title: "Cells: the building blocks of life",
        body: "All living organisms consist of cells. Cells are the basic units of life, and new cells arise from existing ones.\n\nEukaryotic cells have a membrane-bound nucleus. Prokaryotic cells do not. Both rely on a selectively permeable plasma membrane to control what enters and leaves.",
        pages: [1],
      },
      {
        title: "Small structures, specific jobs",
        body: "The nucleus stores DNA. Ribosomes make proteins. Mitochondria produce usable energy as ATP.\n\nThe rough endoplasmic reticulum processes proteins, while the Golgi apparatus modifies, sorts and packages them. Lysosomes break down waste. Plant cells also have chloroplasts for photosynthesis and a cellulose cell wall for support.",
        pages: [2],
      },
      {
        title: "How things move in and out",
        body: "Diffusion moves particles from higher to lower concentration. Osmosis describes water movement across a selectively permeable membrane toward higher solute concentration.\n\nPassive transport moves substances down their concentration gradient without direct energy input. Active transport uses energy to move substances against it.\n\nIn a hypotonic solution, water tends to enter an animal cell. In a hypertonic solution, it tends to leave. Isotonic conditions produce no net water movement.",
        pages: [3],
      },
    ],
    terms: [
      {
        term: "ATP",
        definition:
          "A molecule that supplies usable energy for cellular processes.",
        pages: [2],
      },
      {
        term: "Selective permeability",
        definition:
          "The ability of a membrane to control the movement of substances into and out of a cell.",
        pages: [1],
      },
      {
        term: "Concentration gradient",
        definition:
          "A difference in concentration that influences the movement of substances.",
        pages: [3],
      },
    ],
    formulas: [],
    quiz: quiz.map(([question, options, answer, explanation, topic, page]) => ({
      question,
      options,
      answer,
      explanation,
      topic,
      pages: [page],
    })),
    flashcards: cards.map(([front, back, topic, page]) => ({
      front,
      back,
      topic,
      pages: [page],
    })),
  },
};
