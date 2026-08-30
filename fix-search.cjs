const fs = require('fs');

let content = fs.readFileSync('src/components/XmlEditor.tsx', 'utf-8');

const searchOld = `  useEffect(() => {
    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchLines: number[] = [];

    const lines = conteudo.split('\\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(term)) {
        matchLines.push(idx + 1);
      }
    });

    setMatches(matchLines);
    if (matchLines.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchTerm, conteudo]);`;

const searchNew = `  const prevSearchTermRef = useRef(searchTerm);

  useEffect(() => {
    const isNewSearch = prevSearchTermRef.current !== searchTerm;
    prevSearchTermRef.current = searchTerm;

    if (!searchTerm.trim()) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }

    const term = searchTerm.toLowerCase();
    const matchLines: number[] = [];

    const lines = conteudo.split('\\n');
    lines.forEach((line, idx) => {
      if (line.toLowerCase().includes(term)) {
        matchLines.push(idx + 1);
      }
    });

    setMatches(matchLines);
    if (matchLines.length > 0) {
      if (isNewSearch) {
        setCurrentMatchIndex(0);
      } else {
        setCurrentMatchIndex(prev => {
          if (prev === -1) return 0;
          if (prev >= matchLines.length) return Math.max(0, matchLines.length - 1);
          return prev;
        });
      }
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [searchTerm, conteudo]);`;

if (content.includes(searchOld)) {
  content = content.replace(searchOld, searchNew);
  fs.writeFileSync('src/components/XmlEditor.tsx', content);
  console.log('Fixed search state preservation');
} else {
  console.log('Could not find target');
}
