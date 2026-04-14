const extractQA = (text) => {
  const matches = text.match(/[^.?!]+[?]|[^.?!]+[.]/g) || [];
  const cleaned = matches.map((s) => s.trim());

  let question = "";
  let answer = "";

  for (let i = cleaned.length - 1; i >= 0; i--) {
    const s = cleaned[i];

    if (!question && s.endsWith("?")) {
      question = s.trim();
      if (i + 1 < cleaned.length) {
        answer = cleaned[i + 1].trim();
      }
      break;
    }
  }

  return { question, answer };
};

module.exports = { extractQA };